const video_duration = require('get-video-duration');
const recursive = require('recursive-readdir');
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
      console.log(files[i]);
      var file_promise = new Promise(function(resolve){
        resolve(files[i])
      });
      var date_promise = new Promise(function (resolve, reject){
        fs.stat(files[i], function (error, stats) {
          resolve(stats.birthtimeMs);
        });
      });
      var duration_promise = video_duration(files[i]);
      //var res_promise = '';

      list_promises.push(
        Promise.all([file_promise, date_promise, duration_promise]).then(function(file_data) {
          recordings_list.push({
            file: file_data[0],
            date: new Date(file_data[1]).toISOString(),
            duration: file_data[2]
            //resolution:{width:width, height:height}
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
