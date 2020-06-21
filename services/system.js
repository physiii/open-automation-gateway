// -----------------------------  OPEN-AUTOMATION ------------------------- //
// ------------  https://github.com/physiii/open-automation --------------- //
// ------------------------------- connection.js -------------------------- //

const exec = require('child_process').exec,
	spawn = require('child_process').spawn,
	loop_delay = 60 * 1000,
  diskUsage = require('diskusage'),
	utils = require('../utils');

let TAG = "[connection-manager]";

class System {
  constructor () {
		this.init = this.init.bind(this);
		this.loop();
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
    if (DISABLE_REBOOT) return;
    setTimeout(function () {
      exec("sudo reboot");
    }, delay * 1000);
  }

  softwareInfo () {
		return new Promise(function(resolve, reject) {
			const path = __dirname + '/..',
				git = spawn('git', ['-C', path, 'rev-parse', 'HEAD']);

			git.stdout.on('data', (data) => {
				resolve(`${data}`);
			});

			git.stderr.on('data', (data) => console.log(`softwareInfo: error: ${data}`));
		});
  }

  hardwareInfo () {
    return {"device":"raspberrypi"};
  }

	loop () {
		setInterval((self) => {
			self.checkDiskSpace().then((info) => {
		    let ratio = info.free / info.total;
		    if (ratio < MINIMUM_FREE_SPACE/100) {
		      utils.removeOldCameraRecordings();
		    }
		  });
		}, loop_delay, this);
	}

}

module.exports = new System();
