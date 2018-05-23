const uuid = require('uuid/v4'),
	createDeviceSocket = require('./device-socket.js').createDeviceSocket,
	ServicesManager = require('../services/services-manager.js'),
	reconnectDelay = 5000,
	TAG = '[Device]';

class Device {
	constructor (data) {
		this.id = data.id || uuid();
		this.services = new ServicesManager(data.services, this);
		this.settings = {
			name: data.settings && data.settings.name
		};
		this.info = {
			manufacturer: data.info && data.info.manufacturer
		};

		console.log('NEW DEVICE', this.id);

		this.connectToRelay();
	}

	connectToRelay () {
		console.log('CONNECT TO RELAY', this.id);
		this.socket = createDeviceSocket(this.id, (error, token) => {
			console.log('CONNECTED TO RELAY', this.id);
			if (error) {
				console.error(TAG, this.id, 'Error connecting to relay:', error);

				// Try to reconnect.
				setTimeout(() => this.connectToRelay(), reconnectDelay);

				return;
			}

			this.onRelayConnect(token);
		});
	}

	onRelayConnect (token) {
		this.token = token;
		this.services.setSocket(this.socket);

		// Send current state of device to relay.
		this.socket.emit('load', this.relaySerialize());

		// Try to reconnect on disconnect.
		this.socket.on('disconnect', () => {
			this.socket.close();
			delete this.socket;

			this.connectToRelay();
		});
	}

	emit (event, callback) {}

	serialize () {
		return {
			id: this.id,
			settings: this.settings,
			info: this.info,
			services: this.services.getDbSerializedServices(),
		};
	}

	dbSerialize () {
		return this.serialize();
	}

	relaySerialize () {
		return this.serialize();
	}
}

module.exports = Device;
