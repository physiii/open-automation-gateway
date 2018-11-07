const ServiceApi = require('./service-api.js'),
	TAG = '[ContactSensorApi]';

class ContactSensorApi extends ServiceApi {
	listen () {
		ServiceApi.prototype.listen.call(this);

		this.on('lightOn/set', (data, callback) => {
			this.service.lightOn();
			callback(null, {});
		});
	}
}

module.exports = ContactSensorApi;
