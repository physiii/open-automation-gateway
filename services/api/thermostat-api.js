const ServiceApi = require('./service-api.js');

class ThermostatApi extends ServiceApi {
	listen () {
		ServiceApi.prototype.listen.call(this);

		this.on('mode/set', (data, callback) => {
			this.service.setThermostatMode(data.mode);
			callback(null, {});
		})

		this.on('temp/set', (data, callback) => {
			this.service.setTemp(data.temp);
			callback(null, {});
		});

		this.on('fanMode/set', (data, callback) => {
			this.service.setFanMode(data.mode);
			callback(null, {});
		});

		this.on('holdMode/set', (data, callback) => {
			this.service.setHoldMode(data.mode);
			callback(null, {});
		});
	}
}

module.exports = ThermostatApi;
