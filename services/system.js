// -----------------------------  OPEN-AUTOMATION ------------------------- //
// ------------  https://github.com/physiii/open-automation --------------- //
// ------------------------------- connection.js -------------------------- //

const exec = require('child_process').exec,
  diskUsage = require('diskusage'),
  config = require('../config.json');

let TAG = "[connection-manager]";

class System {
  constructor () {
		this.init = this.init.bind(this);
	}

  init () {
		return;
	}

  checkDiskSpace () {
    return new Promise(function(resolve, reject) {
      diskUsage.check('/', function (error, info) {
        if (error) {
          return console.log(TAG, error);
        }
        resolve(info);
      });
    })
  }

  reboot (delay) {
    if (!delay) delay = 0;
    if (config.disable_reboot) return;
    setTimeout(function () {
      exec("sudo reboot");
    }, delay * 1000);
  }

  softwareInfo () {
    return "0.2";
  }

  hardwareInfo () {
    return {"device":"raspberrypi"};
  }
}

module.exports = new System();
