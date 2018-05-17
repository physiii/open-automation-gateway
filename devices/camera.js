// ---------------------------  OPEN-AUTOMATION -------------------------------- //
// --------------  https://github.com/physiii/open-automation  ----------------- //
// ------------------------------- camera.js ----------------------------------- //

var exec = require('child_process').exec;
const video_duration = require('get-video-duration');
const recursive = require('recursive-readdir');
var ffmpeg_fluent = require('fluent-ffmpeg');
var path = require('path');
var fs = require('fs');
var crypto = require('crypto')
var promiseAllSoftFail = require('promise-all-soft-fail').promiseAllSoftFail;
const services = require('../services/services.js');

var TAG = "[camera.js]";

// ------------- //
// sockets calls //
// ------------- //

socket.relay.on('camera/recordings/get', function (data, callback) {
  recordings_list(data, callback)
});

socket.relay.on('camera/stream/live', (data) => {
  const camera = services.getServiceById(data.camera_service_id);
  camera.streamLive();
});

socket.relay.on('camera/stream/recording', (data) => {
  // TODO: How do we store/look up recordings?
});

socket.relay.on('camera/stream/recordings', (data) => {
  // TODO: How do we store/look up recordings?
  // TODO: Figure out how ffmpeg plays multiple files.
});

socket.relay.on('camera/stream/stop', (data) => {
  const camera = services.getServiceById(data.camera_service_id);
  camera.stopStream();
});

socket.relay.on('camera/preview/get', (data) => {
  const camera = services.getServiceById(data.camera_service_id);
  // TODO
});


// Deprecated socket events - backwards-compatibility with Open Automation 1

socket.relay.on('folder list', function (data) {
  // TODO: Figure out migration path to new recordings folder for relay.
  var folder = data.folder;
  var command = "ls -lah --full-time "+folder;
  //console.log('folder list',command);
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      data.error = error;
      relay.emit('folder list result',data);
      return;
    }
    //console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
    data.stdout = stdout;
    data.stderr = stderr;
   socket.relay.emit('folder list result',data);
  });
});

socket.relay.on('get camera preview', function (data) {
  var camera_number = data.camera_number;
  var socket_id = data.socket_id;
  send_camera_preview(camera_number, socket_id);
  console.log(TAG,"get camera preview",camera_number)
});

socket.relay.on('ffmpeg', function (data) {
  const camera = services.getServiceById(data.camera_service_id);

  if (data.command == "start_webcam") {
    camera.streamLive();
  }

  if (data.command == "stop") {
    camera.stopStream();
  }

  if (data.command == "play_file") {
    // TODO
    // start_ffmpeg(data);
  }

  if (data.command == "play_folder") {
    return;

    // TODO

    var folder = data.folder;
    var new_folder_list = "concat:";
    var command = "ls -lah --full-time "+folder;
    exec(command, (error, stdout, stderr) => {
      if (error) return console.error(`exec error: ${error}`);
      var folder_list = stdout.split(/(?:\r\n|\r|\n)/g);
      folder_list.splice(0,1);
      folder_list.splice(folder_list.length - 1,1);

      for (var i = 0; i < folder_list.length; i++) {
        var parts = folder_list[i].split(" ");
        if (parts.length < 8) continue;
        parts.folder = data.folder;
        for (var k = 0; k < parts.length; k++) {
          if (parts[k].length < 1) {
            parts.splice(k,1);
            k--;
          }
        }
        if (parts[8].charCodeAt(0) == 46) {
          if (parts[8].charCodeAt(1) == 46) {
          } else if (parts[8].length < 2) {
            folder_list.splice(i,1);
            i--;
            continue;
          }
        }
        parts.name = parts[8];
        if (parts.name.indexOf(".avi") < 0) continue;
        new_folder_list = new_folder_list + parts.folder + "/" + parts.name + "|";
      }
      data.folder_list = new_folder_list.substring(0 , new_folder_list.length -1);
      //console.log("folder_list ",data.folder_list);
      start_ffmpeg(data);
    });
  }
});

// ---------------- //
// camera functions //
// ---------------- //

function recordings_list (data, callback) {
  var directory = path.join('/usr/local/lib/gateway/events', data.camera_number.toString());

  recursive(directory, function (error, files) {
    var recordings_list = [];
    var list_promises = [];

    if (error) {
      if (typeof callback === 'function') {
        callback('Error getting recordings');
      }

      return;
    }

    for (i = 0; files.length > i; i++) {
      var file_promise = new Promise(function (resolve) {
        // No error handling because we always just resolve with the file path.
        resolve(files[i])
      });

      var date_promise = new Promise(function (resolve, reject) {
        try {
          fs.stat(files[i], function (error, stats) {
            if (error) {
              reject(error);
              return;
            }

            resolve(stats.birthtimeMs);
          });
        } catch (error) {
          reject(error);
        }
      });

      var duration_promise = video_duration(files[i]);

      var res_promise = new Promise(function (resolve, reject) {
        try {
          ffmpeg_fluent(files[i]).ffprobe(function (error, file_info) {
            if (error) {
              reject(error);
              return;
            }

            resolve({
              width: file_info.streams[0].width,
              height: file_info.streams[0].height
            });
          });
        } catch (error) {
          reject(error);
        }
      });

      list_promises.push(
        promiseAllSoftFail([file_promise, date_promise, duration_promise, res_promise]).then(function (file_data) {
          var recording = {
              id: null,
              file: file_data[0],
              date: file_data[1],
              duration: file_data[2],
              resolution: file_data[3]
            };

          try {
            recording.id = crypto.createHash('sha256').update(file_data[0]).digest('hex');
          } catch (error) {
            reject(error);
          }

          if (!recording.date || Object.prototype.toString.call(recording.date) === '[object Error]') {
            recording.date = null;
            recording.error = 'Error getting recording date';
          }

          if (!recording.duration || Object.prototype.toString.call(recording.duration) === '[object Error]') {
            recording.duration = null;
            recording.error = 'Error getting recording duration';
          }
          if (!recording.resolution || Object.prototype.toString.call(recording.resolution) === '[object Error]') {
            recording.resolution = null;
            recording.error = 'Error getting recording resolution';
          }

          // Convert date to ISO 8601 string
          if (recording.date) {
            recording.date = new Date(recording.date).toISOString();
          }

          recordings_list.push(recording);
        })
      );
    };

    Promise.all(list_promises).then(function () {
      recordings_list.sort(function (a, b){
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        return 0;
      });

      if (typeof callback === 'function') {
        callback(null, recordings_list);
      }
    }).catch(function () {
      if (typeof callback === 'function') {
        callback('Error getting recordings');
      }
    });
  })
}

function send_camera_preview(camera_number, socket_id) {
  var path = '/usr/local/lib/gateway/events/' + camera_number + '/preview.jpg';
  fs.readFile(path, function(err, data) {
    if (err) return console.log(err); // Fail if the file can't be read.
    var settings = database.settings;
    var image = data.toString('base64');
    data_obj = {mac:settings.mac, token:settings.token, camera_number:camera_number, socket_id:socket_id, image:image}
    socket.relay.emit('camera preview',data_obj);
    console.log(TAG,'send_camera_preview',data_obj.mac,data_obj.camera_number);
  });
}
