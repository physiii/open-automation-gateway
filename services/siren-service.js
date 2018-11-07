const Service = require('./service.js'),
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

	dbSerialize () {
		return {
			...Service.prototype.dbSerialize.apply(this, arguments),
			ip: this.ip
		};
	}
}

module.exports = SirenService;
