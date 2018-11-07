const Service = require('./service.js'),
config = require('../config.json'),
  Gpio = require('onoff').Gpio,
	SirenApi = require('./api/siren-api.js'),
	TAG = '[SirenService]';

class SirenService extends Service {
	constructor (data, relaySocket, save) {
		super(data, relaySocket, save, SirenApi);

		this.ip = data.ip;
    this.siren = new Gpio(config.siren_Gpio, 'out'),
	}

	subscribeToDriver () {
		return;
	}

	onReady (data) {
		return;
	}

  alarmSet (value) {

    if(value) {
      this.siren.writeSync(0);
    } else if (!value) {
      this.siren.writeSync(1);
    } else {
      console.log(TAG, 'Invalid value for Siren');
    }

  }

	dbSerialize () {
		return {
			...Service.prototype.dbSerialize.apply(this, arguments),
			ip: this.ip
		};
	}
}

module.exports = SirenService;
