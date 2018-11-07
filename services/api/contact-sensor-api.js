const ServiceApi = require('./service-api.js'),
	TAG = '[ContactSensorApi]';

class ContactSensorApi extends ServiceApi {
	listen () {
		ServiceApi.prototype.listen.call(this);

	}
}

module.exports = ContactSensorApi;
