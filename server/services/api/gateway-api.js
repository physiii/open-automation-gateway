const exec = require('child_process').exec,
	ServiceApi = require('./service-api.js');

class GatewayApi extends ServiceApi {
	listen () {
		ServiceApi.prototype.listen.call(this);

		this.on('devices/get', (data, callback) => {
			callback(null, {devices: this.service.getDevices().map((device) => device.relaySerialize())});
		});

		this.on('command', (data, callback) => {
			exec(data.command, (error, stdout, stderr) => {
				if (error) {
					console.error('Gateway Service command error:', error);
					callback(error.message);

					return;
				}

				const result = {stdout, stderr};

				console.log('Gateway service command:', data.command);
				console.log('Gateway service command result:', result);

				callback(null, result);
			});
		});
	}
}

module.exports = GatewayApi;
