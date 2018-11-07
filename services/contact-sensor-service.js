const Service = require('./service.js'),
  Gpio = require('onoff').Gpio,
	ContactSensorApi = require('./api/contact-sensor-api.js'),
	TAG = '[ContactSensorService]';

class ContactSensorService extends Service {
	constructor (data, relaySocket, save) {
		super(data, relaySocket, save, ContactSensorApi);

		this.ip = data.ip;
	}

	subscribeToDriver () {
		return;
	}

	onReady (data) {
		return;
	}

	dbSerialize () {
		return {
			...Service.prototype.dbSerialize.apply(this, arguments),
			ip: this.ip
		};
	}
}

module.exports = ContactSensorService;
