// -----------------------------  OPEN-AUTOMATION ------------------------- //
// ------------  https://github.com/physiii/open-automation --------------- //
// ------------------------------- connection.js -------------------------- //

const exec = require('child_process').exec,
  diskUsage = require('diskusage');

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

  reboot () {
    exec("sudo reboot");
  }

  version () {
    return "0.2";
  }
}

module.exports = new System();
