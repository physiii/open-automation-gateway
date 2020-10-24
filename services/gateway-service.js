const exec = require('child_process').exec,
	Service = require('./service.js'),
	ConnectionManager = require('./connection.js'),
	config = require('../config.json'),
	axios = require('axios'),
	GatewayApi = require('./api/gateway-api.js'),
	DevicesManager = require('../devices/devices-manager.js'),
	TAG = '[GatewayService]';

class GatewayService extends Service {
	constructor (data, relay_socket, save) {
		super(data, relay_socket, save, GatewayApi);
	}

	getDevices () {
		return DevicesManager.getDevices();
	}
}

module.exports = GatewayService;
