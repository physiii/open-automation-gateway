const ServiceApi = require('./service-api.js'),
	TAG = '[SirenApi]';

class SirenApi extends ServiceApi {
	listen () {
		ServiceApi.prototype.listen.call(this);

		this.on('alarm/set', (data, callback) => {
			this.service.alarmSet(data.value);
			callback(null, {});
		});

		this.on('siren/on', (data, callback) => {
			this.service.sirenOn();
			callback(null, {});
		});

		this.on('siren/off', (data, callback) => {
			this.service.sirenOff();
			callback(null, {});
		});

		this.on('log/get', (data, callback) => {
			this.service.getSirenLogs().then((log) => {
				callback(null, {log});
			}).catch((error) => {
				callback(error);
			});
		});

	}
}

module.exports = SirenApi;
