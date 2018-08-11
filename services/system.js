// -----------------------------  OPEN-AUTOMATION ------------------------- //
// ------------  https://github.com/physiii/open-automation --------------- //
// ------------------------------- connection.js -------------------------- //

const exec = require('child_process').exec;

let TAG = "[connection-manager]";

class System {
  constructor () {
		this.init = this.init.bind(this);
	}

  init () {
		return;
	}

  reboot () {
    exec("sudo reboot");
  }
}

module.exports = new System();
