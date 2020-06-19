// -----------------------------  OPEN-AUTOMATION ------------------------- //
// ------------  https://github.com/physiii/open-automation --------------- //
// ------------------------------- connection.js -------------------------- //

const exec = require('child_process').exec,
	spawn = require('child_process').spawn,
	loop_delay = 60 * 1000,
  diskUsage = require('diskusage'),
	utils = require('../utils'),
	user = config.user,
	server = config.server,
	dest_dir = config.dest_dir;

let TAG = "[Backup]";

class Backup {
  constructor () {
		this.loop();
	}

	sync () {

		utils.checkIfProcessIsRunning('rsync').then((isRunning) => {
			if (!isRunning) {
				const source_dir = config.source_dir + id + "/",
					command = 'rsync -avz -e "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" --progress ' + source_dir + ' ' + user + '@' + server + ':' + dest_dir;

				exec(command);
				console.log(command);
			}
		});

  }

	loop () {
		setInterval((self) => {
			this.sync();
		}, loop_delay, this);
	}

}

module.exports = new Backup();
