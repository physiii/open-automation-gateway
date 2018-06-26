const ServiceApi = require('./service-api.js');

class GatewayApi extends ServiceApi {
	constructor (socket, gateway) {
		super(socket, gateway, 'gateway');

		this.gateway = gateway;
		this.listen();
	}

	listen () {
		this.on('device/add', (data, callback) => {
			const device = this.gateway.addDevice(data);
			callback(null, device.relaySerialize());
		});
	}
}

module.exports = GatewayApi;
