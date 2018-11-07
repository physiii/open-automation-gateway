const Service = require('./service.js'),
  Gpio = require('onoff').Gpio,
  Siren = new Gpio(20, 'out'),
	SirenApi = require('./api/siren-api.js'),
	TAG = '[SirenService]';

class SirenService extends Service {
	constructor (data, relaySocket, save) {
		super(data, relaySocket, save, SirenApi);

		this.ip = data.ip;
	}

	subscribeToDriver () {
		return;
	}

	onReady (data) {
		return;
	}

  alarmSet (value) {
    Siren.writeSync(value);
  }

	dbSerialize () {
		return {
			...Service.prototype.dbSerialize.apply(this, arguments),
			ip: this.ip
		};
	}
}

module.exports = SirenService;
