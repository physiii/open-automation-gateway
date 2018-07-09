const exec = require('child_process').exec,
	ServiceApi = require('./service-api.js');

class GatewayApi extends ServiceApi {
	constructor (socket, gateway) {
		super(socket, gateway, 'gateway');

		this.gateway = gateway;
		this.listen();
	}

	listen () {
		this.on('devices/get', (data, callback) => {
			callback(null, {devices: this.gateway.getDevices().map((device) => device.relaySerialize())});
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
