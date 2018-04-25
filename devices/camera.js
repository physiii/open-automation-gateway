// ---------------------------  OPEN-AUTOMATION -------------------------------- //
// --------------  https://github.com/physiii/open-automation  ----------------- //
// ------------------------------- camera.js ----------------------------------- //

var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
const video_duration = require('get-video-duration');
const recursive = require('recursive-readdir');
var ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfprobePath(pathToFfprobeExecutable);
var fs = require('fs');
var TAG = "[camera.js]";
var STREAM_PORT = config.video_stream_port || 5054;
var use_ssl = config.use_ssl || false;
var use_domain_ssl = config.use_domain_ssl || false;
var use_dev = config.use_dev || false;
var device_hw = config.device_hw || 'hw:0'
var motion;
var ffmpeg_pass = [];
var command = [];
ffmpeg_timer = setTimeout(function () {}, 1);

// ---------- //
// initialize //
// ---------- //

load_cameras();
pass_camera_stream();
start_motion();

mac = "init";
require('getmac').getMac(function(err,macAddress){
  if (err)  throw err
  mac = macAddress.replace(/:/g,'').replace(/-/g,'').toLowerCase();
});

// ------------- //
// sockets calls //
// ------------- //

socket.relay.on('folder list', function (data) {
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

socket.relay.on('camera/recordings/get', function (data, callback) {
  recordings_list(data, callback)
})

socket.relay.on('get camera preview', function (data) {
  var camera_number = data.camera_number;
  var socket_id = data.socket_id;
  send_camera_preview(camera_number, socket_id);
  console.log(TAG,"get camera preview",camera_number)
});

socket.relay.on('ffmpeg', function (data) {
  if (data.command == "start_webcam") {
    start_ffmpeg(data);
  }
  if (data.command == "stop") {
    console.log(TAG,"stop command received");
    stop_ffmpeg(ffmpeg);
  }
  if (data.command == "play_file") {
    console.log("playing file");
    start_ffmpeg(data);
  }
  if (data.command == "play_folder") {
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

function recordings_list(data, callback){
  var directory = path.join(__dirname, '../', '/motion/events/', data.camera_number);

  recursive(directory, function(err, files){
    //console.log(files);
    var recordings_list = [];
    var list_promises = [];

    for(i = 0; files.length > i; i++){

      var file_promise = new Promise(function(resolve){
        resolve(files[i])
      });

      var date_promise = new Promise(function (resolve, reject){
        fs.stat(files[i], function (error, stats) {
          resolve(stats.birthtimeMs);
        });
      });

      var duration_promise = video_duration(files[i]);

      var res_promise = new Promise(function (resolve) {
        ffmpeg(files[i]).ffprobe(function(err, file_info) {
          var resolution = {
            width: file_info.streams[0].width,
            height: file_info.streams[0].height
          };
          resolve(resolution);
        });
      });


      list_promises.push(
        Promise.all([file_promise, date_promise, duration_promise, res_promise]).then(function(file_data) {
          recordings_list.push({
            file: file_data[0],
            date: new Date(file_data[1]).toISOString(),
            duration: file_data[2],
            resolution: file_data[3]
          });
        })
      );
    }
    Promise.all(list_promises).then(function(){
      if (typeof callback === 'function') {
        callback(null,recordings_list)
      }
    });
  })
}


function load_cameras() {
  var command = "ls -lah --full-time /dev/video*";
  exec(command, (error, stdout, stderr) => {
    if (error) return console.error(`exec error: ${error}`);
    var parts = stdout.split(/(?:\r\n|\r|\n| )/g);
    for (var i=0; i<parts.length-1; i++) {
      var part = parts[i];
      if (part.indexOf("/dev/video") < 0) continue;
      var dev = part;
      var camera_number = part.replace("/dev/video","");
      var id = mac+"_"+camera_number;
      var camera = {camera_number:camera_number, dev:dev, id:id, type:"camera"};
      database.store_device(camera);
      console.log(TAG,"load_cameras",camera);
    }
  });
}

function pass_camera_stream() {
	//return;

    command =  [
                   '-loglevel', 'panic',
                   '-f', 'v4l2',
                   '-pix_fmt', 'rgb24',
                   '-i', '/dev/video0',
                   '-f', 'v4l2',
                   '/dev/video10',
                   '-f', 'v4l2',
		   '/dev/video20'
                   //'-f', 'v4l2',
		   //'/dev/video30'
                 ];


    /*command2 =  [
                   '-loglevel', 'panic',
                   '-f', 'v4l2',
                   '-pix_fmt', 'rgb24',
                   '-i', '/dev/video1',
                   '-f', 'v4l2',
                   '/dev/video11',
                   '-f', 'v4l2',
		   '/dev/video21'
                 ];*/


  ffmpeg_pass[0] = spawn('ffmpeg', command);
  ffmpeg_pass[0].stdout.on('data', (data) => {console.log(TAG,`[pass_camera_stream] ${data}`)});
  ffmpeg_pass[0].stderr.on('data', (data) => {console.log(`stderr: ${data}`)});
  ffmpeg_pass[0].on('close', (code) => {console.log(TAG,`ffmpeg_pass child process exited with code ${code}`)});
  //ffmpeg -f v4l2 -pix_fmt rgb24 -i /dev/video0 -f v4l2 /dev/video10 -f v4l2 /dev/video11

  /*ffmpeg_pass2 = spawn('ffmpeg', command2);
  ffmpeg_pass2.stdout.on('data', (data) => {console.log(TAG,`[pass_camera_stream] ${data}`)});
  ffmpeg_pass2.stderr.on('data', (data) => {console.log(`stderr: ${data}`)});
  ffmpeg_pass2.on('close', (code) => {console.log(TAG,`ffmpeg_pass2 child process exited with code ${code}`)});*/

  console.log(TAG,"ffmpeg_pass");
}

function start_motion() {

  var command = "ps aux | grep -v 'log' | grep motion.py";
  exec(command, (error, stdout, stderr) => {
    if (stdout.length > 100) return console.log("motion already started", stdout.length);
    if (error) return console.error(`exec error: ${error}`);
    console.log(TAG,"length:",stdout.length);
    console.log(TAG,"launching motion.py");
   // var conf = { "picamera":0, "device":"/dev/video10", "show_video": false, "min_upload_seconds": 3.0, "min_motion_frames": 8, "camera_warmup_time": 2.5, "delta_thresh": 5, "resolution": [800, 600], "fps": 16, "min_area": 5000 };

    //var conf = "{\"test\":'testing'}";
    //var conf = {test:"testing"};
    //conf = conf.toString();

    motion = spawn('python',[__dirname+'/../motion/motion.py']);
    //motion = spawn('python',[__dirname+'/../motion/motion.py',conf]);
    //motion = spawn('python',[__dirname+'/../motion/motion.py','-c',__dirname+'/../motion/conf.json']);

    motion.stdout.on('data', (data) => {
      //console.log(TAG,`[motion] ${data}`)
      if(data && data.includes("[MOTION]")  ){
         //console.log('motion detected');
         socket.relay.emit('motion detected', data);
      } else if(data && data.includes("[NO MOTION]")) {
         //console.log('motion stopped');
         socket.relay.emit('motion stopped', data);
      }
    });
    motion.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`)
    });
  });
  console.log(TAG,"start_motion");
}

function send_camera_preview(camera_number, socket_id) {
  var path = __dirname + "../motion/preview.jpg";
  fs.readFile(path, function(err, data) {
    if (err) return console.log(err); // Fail if the file can't be read.
    var settings = database.settings;
    var image = data.toString('base64');
    data_obj = {mac:settings.mac, token:settings.token, camera_number:camera_number, socket_id:socket_id, image:image}
    socket.relay.emit('camera preview',data_obj);
    console.log(TAG,'send_camera_preview',data_obj.mac,data_obj.camera_number);
  });
}

function send_file_duration (data) {

  var command = "ffmpeg -i \""+data.folder_list+"\" -f null /dev/null";
  console.log(TAG,"send_file_duration",command);
  exec(command, (error, stdout, stderr) => {
    if (error) {
      return console.error(TAG,"ffmpeg failed!");
    }
    data.info = stdout;
    socket.relay.emit('file info',data);
    console.log(TAG,"file info: ",data.info);
  });

}

var ffmpeg_proc_list = [];
function start_ffmpeg(data) {
  var relay_server = config.relay_server;
  var index = utils.find_index(device_array,"camera_number",data.camera_number);
  if (index < 0) return console.log("camera not found",camera_number);
  var camera = device_array[index];

  for (var i = 0; i < ffmpeg_proc_list.length; i++) {
    console.log("ffmpeg_proc_list: ", ffmpeg_proc_list[i].tag.camera_number,data);
    if (ffmpeg_proc_list[i].tag.camera_number == data.camera_number) {
      //if (data.command == "start_webcam" && ffmpeg_proc_list[i].tag.command == "start_webcam") return console.log("stream already started");
      stop_ffmpeg(ffmpeg_proc_list[i]);
      console.log(TAG,"killing current ffmpeg process",ffmpeg_proc_list[i].tag);
      /*if (data.command == "play_file") {
        stop_ffmpeg(ffmpeg_proc_list[i]);
        console.log(TAG,"killing current ffmpeg process",ffmpeg_proc_list[i].tag.camera_number);
      }
      if (data.command == "play_folder") {
        stop_ffmpeg(ffmpeg_proc_list[i]);
        console.log(TAG,"killing current ffmpeg process",ffmpeg_proc_list[i].tag.camera_number);
      }*/
    }
  }

  var settings = database.settings;
  var camera_number = camera.camera_number;
  var video_width = camera.resolution.width;
  var video_height = camera.resolution.height;
  if (!video_width) video_width = "640";
  if (!video_height) video_height = "480";


  //ffmpeg -f alsa -i hw:1 -s 1280x720 -f v4l2 -i /dev/video20 -f mpegts -codec:a mp2 -ar 44100 -ac 1 -b:a 128k -codec:v mpeg1video -b:v 600k -r 2 -strict -1 http://pyfi.org:8082/09380fc2e0dcf35a04bcc15e254bf4d05cade3047d93ba5b2d87244057add8da260b0a387681bba52e2d9d3cdd4c61474ac5b3918fe75673b7fd70d94bc4418d/20/
  if (data.command == "start_webcam") {
    if (use_dev == false){
    var command =  [
                   //'-loglevel', 'panic',
                   //'-r', '2',
                   //'-strict', '-1',
                   '-f', 'alsa',
                   '-i', device_hw,
                   '-s', video_width+"x"+video_height,
                   '-f', 'v4l2',
                   '-i', '/dev/video'+camera_number,
                   '-f', 'mpegts',
		   '-codec:a', 'mp2',
		   '-ar', '44100',
		   '-ac', '1',
	  	   '-b:a', '128k',
		   '-codec:v', 'mpeg1video',
                   '-b:v', '600k',
                   '-r', '2',
                   '-strict', '-1',
                   "https://"+relay_server+":"+STREAM_PORT+"/"+settings.token+"/"+camera_number+"/"
                 ];
    }
    if (use_domain_ssl || use_ssl) {
      var command =  [
                   //'-loglevel', 'panic',
                   //'-r', '2',
                   //'-strict', '-1',
                   '-f', 'alsa',
                   '-i', device_hw,
                   '-s', video_width+"x"+video_height,
                   '-f', 'v4l2',
                   '-i', '/dev/video'+camera_number,
                   '-f', 'mpegts',
		   '-codec:a', 'mp2',
		   '-ar', '44100',
		   '-ac', '1',
	  	   '-b:a', '128k',
		   '-codec:v', 'mpeg1video',
                   '-b:v', '600k',
                   '-r', '2',
                   '-strict', '-1',
                   "https://"+relay_server+":"+STREAM_PORT+"/"+settings.token+"/"+camera_number+"/"
                 ];
    }
    if (use_domain_ssl == false && use_dev && use_ssl == false){
      var command =  [
                   //'-loglevel', 'panic',
                   //'-r', '2',
                   //'-strict', '-1',
                   '-f', 'alsa',
                   '-i', device_hw,
                   '-s', video_width+"x"+video_height,
                   '-f', 'v4l2',
                   '-i', '/dev/video'+camera_number,
                   '-f', 'mpegts',
		   '-codec:a', 'mp2',
		   '-ar', '44100',
		   '-ac', '1',
	  	   '-b:a', '128k',
		   '-codec:v', 'mpeg1video',
                   '-b:v', '600k',
                   '-r', '2',
                   '-strict', '-1',
                   "http://"+relay_server+":"+STREAM_PORT+"/"+settings.token+"/"+camera_number+"/"
                 ];
    }
  }
  if (data.command == "play_file") {
    /*if (ffmpeg)
      stop_ffmpeg(ffmpeg);*/
    if (use_dev == false){
    var command =  [
                   //'-loglevel', 'panic',
                   '-i', data.file,
                   '-f', 'mpegts',
		   '-codec:v', 'mpeg1video',
                   '-b:v', '600k',
                   '-r', '24',
                   '-strict', '-1',
                   "https://"+relay_server+":"+STREAM_PORT+"/"+settings.token+"/"+camera_number+"/"
                 ];
    }
    if (use_domain_ssl || use_ssl) {
    var command =  [
                   //'-loglevel', 'panic',
                   '-i', data.file,
                   '-f', 'mpegts',
		   '-codec:v', 'mpeg1video',
                   '-b:v', '600k',
                   '-framerate', '10',
                   '-strict', '-1',
                   "https://"+relay_server+":"+STREAM_PORT+"/"+settings.token+"/"+camera_number+"/"
                 ];
    }
    if (use_domain_ssl == false && use_dev && use_ssl == false){
    var command =  [
                   //'-loglevel', 'panic',
                   '-i', data.file,
                   '-f', 'mpegts',
		   '-codec:v', 'mpeg1video',
                   '-b:v', '600k',
                   '-r', '24',
                   '-strict', '-1',
                   "http://"+relay_server+":"+STREAM_PORT+"/"+settings.token+"/"+camera_number+"/"
                 ];
    }
    console.log("playing file:",command);
    //console.log("ng file:",data.file);
  }

  if (data.command == "play_folder") {
    if (use_dev == false){
    var command =  [
                   //'-loglevel', 'panic',
                   '-r', '24',
                   '-strict', '-1',
                   '-i', data.folder_list,
                   '-f', 'mpegts',
		   '-codec:v', 'mpeg1video',
                   '-r', '24',
                   '-strict', '-1',
		   //'-ss', '00:00:30',
                   "https://"+relay_server+":"+STREAM_PORT+"/"+settings.token+"/"+camera_number+"/"
                 ];
    }
    if (use_domain_ssl || use_ssl) {
    var command =  [
                   //'-loglevel', 'panic',
                   '-r', '24',
                   '-strict', '-1',
                   '-i', data.folder_list,
                   '-f', 'mpegts',
		   '-codec:v', 'mpeg1video',
                   '-r', '24',
                   '-strict', '-1',
		   //'-ss', '00:00:30',
                   "https://"+relay_server+":"+STREAM_PORT+"/"+settings.token+"/"+camera_number+"/"
                 ];
    }
    if (use_domain_ssl == false && use_dev && use_ssl == false){
    var command =  [
                   //'-loglevel', 'panic',
                   '-r', '24',
                   '-strict', '-1',
                   '-i', data.folder_list,
                   '-f', 'mpegts',
		   '-codec:v', 'mpeg1video',
                   '-r', '24',
                   '-strict', '-1',
		   //'-ss', '00:00:30',
                   "http://"+relay_server+":"+STREAM_PORT+"/"+settings.token+"/"+camera_number+"/"
                 ];
    }
    send_file_duration(data);
    //console.log("ffmpeg play_folder:");
  }
   //console.log("ffmpeg command:",command);
   ffmpeg = spawn('ffmpeg', command);
   ffmpeg.tag = data;
   //ffmpeg.stdout.on('data', (data) => {console.log(`stdout: ${data}`)});
   //ffmpeg.stderr.on('data', (data) => {console.log(`stderr: ${data}`)});
   ffmpeg_proc_list.push(ffmpeg);
   ffmpeg.on('close', (code) => {
    //stop_ffmpeg(ffmpeg);
    for (var i = 0; i < ffmpeg_proc_list.length; i++) {
      console.log("closed: ", ffmpeg_proc_list[i].tag.camera_number);
      if (ffmpeg_proc_list[i].tag.camera_number == data.camera_number) {
        stop_ffmpeg(ffmpeg_proc_list[i]);
        ffmpeg_proc_list.splice(i,1);
        //console.log(TAG,"ffmpeg closed");
      }
    }
    console.log(`child process exited with code ${code}`);
  });

  if (camera.stream_timeout) {
    setTimeout(
      (function(f) {
        return function() {
          stop_ffmpeg(f);
          console.log(TAG,"timeout",f.tag.camera_number,camera.stream_timeout);
        }
    })(ffmpeg), camera.stream_timeout*60*1000);
    console.log(TAG,"timeout",camera.stream_timeout);
  }

  ffmpeg_started = true;
  socket.relay.emit('ffmpeg started',settings);
}

function stop_ffmpeg(ffmpeg) {
    ffmpeg.kill();
    ffmpeg_started = false;
    console.log(TAG,'ffmpeg stop',ffmpeg.tag.camera_number);
}

camera_loop();
function camera_loop () {
  setTimeout(function () {
    camera_loop();
  }, 2*60*1000);
  check_ffmpeg();
}

function check_ffmpeg() {
  var command = "ps aux | grep -v 'grep' | grep ffmpeg";
  exec(command, (error, stdout, stderr) => {
    if (error) {
      pass_camera_stream();
      return console.error(TAG,"check_ffmpeg failed...restarting ffmpeg!");
    }
    console.log(TAG,"ffmpeg...good");
  });
}
