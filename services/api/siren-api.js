const ServiceApi = require('./service-api.js'),
	TAG = '[SirenApi]';

class SirenApi extends ServiceApi {
	listen () {
		ServiceApi.prototype.listen.call(this);

		this.on('alarm/set', (data, callback) => {
			this.service.alarmSet(data.value);
			callback(null, {});
		});
	}
}

module.exports = SirenApi;
