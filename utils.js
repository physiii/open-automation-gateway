// -----------------------------  OPEN-AUTOMATION ------------------------ //
// ------------  https://github.com/physiii/open-automation -------------- //
// --------------------------------- utils.js ---------------------------- //

const crypto = require('crypto');
var os = require('os');
var request = require('request');
var fs = require('fs');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var TAG = "[utils.js]";
var free_space_limit = 500 * 1000000;

module.exports = {
  find_index: find_index,
  get_mac: get_mac,
  update: update
}

// ---------------------- device info  ------------------- //
var mac = "init";
var type = "gateway";
get_mac();

// ----------------------  disk management -------------- //

const disk = require('diskusage');
var disk_path = os.platform() === 'win32' ? 'c:' : '/';
var findRemoveSync = require('find-remove');
var _ = require('underscore');
var path = require('path');
var rimraf = require('rimraf');
timeout();

check_diskspace();
function timeout() {
  setTimeout(function () {
    check_diskspace();
    timeout();
  }, 5*60*1000);
}

function check_diskspace() {
  disk.check(disk_path, function(err, info) {
    if (err) return console.log(err);
    module.exports.disk = {free:info.free, total:info.total};
    if (info.free < free_space_limit) {
      remove_old_files();
    }
    console.log(TAG,'free space:',info.free);
  });
}

function remove_old_files() {
  // Return only base file name without dir
  var command = "find /usr/local/lib/gateway/events -type f -printf '%T+ %p\n' | sort | head -n 1";
  exec(command, (error, stdout, stderr) => {
    if (error) {return console.error(`exec error: ${error}`)}
    if (!stdout) return console.log(TAG,"no motion files found to remove",command);
    var temp_arr = stdout.split(" ")[1].split("/");
    temp_arr[temp_arr.length - 1] = "";
    var oldest_dir = "";
    for (var i = 0; i < temp_arr.length; i++) {
      if (temp_arr[i] == "") continue;
      oldest_dir+="/"+temp_arr[i];
    }
    try {
      //var result = findRemoveSync(oldest_dir, {age: {seconds: 0}}, {files: '*'});
      rimraf(oldest_dir, function(error) {
        if(error) return console.log(error);
        console.log(TAG,'directory deleted',oldest_dir);
      });
    }
    catch (e) {console.log(TAG,e)};
  });
}

function get_mac () {
  require('getmac').getMac(function(err,macAddress){
    if (err)  throw err
    mac = macAddress.replace(/:/g,'').replace(/-/g,'').toLowerCase();
    var token = crypto.createHash('sha512').update(mac).digest('hex');
    console.log("Device ID: " + mac);
    module.exports.mac = mac;
  });
}

// ----------------------  update  --------------------- //

function update() {
  var path = __dirname.replace("/gateway","");
  console.log("pull from ", path)
  var command =  ['-C', path, 'pull'];
  var git = spawn('git', command);
  git.stdout.on('data', (data) => {console.log(`update: ${data}`)});
  git.stderr.on('data', (data) => {console.log(`stderr: ${data}`)});
  git.on('close', (code) => {});
  exec("pm2 restart gateway", (error, stdout, stderr) => {
    if (error) {return console.error(`exec error: ${error}`)}
    console.log(stdout);
    console.log(stderr);
  });
}

function find_index(array, key, value) {
  for (var i=0; i < array.length; i++) {
    if (array[i][key] == value) {
      return i;
    }
  }
  return -1;
}
