const video_duration = require('get-video-duration');
const recursive = require('recursive-readdir');
var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');
var path = require('path');


module.exports = {
  recordings_list: recordings_list
}



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
