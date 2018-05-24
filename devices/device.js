const uuid = require('uuid/v4'),
	createDeviceSocket = require('./device-socket.js').createDeviceSocket,
	ServicesManager = require('../services/services-manager.js'),
	TAG = '[Device]';

class Device {
	constructor (data) {
		this.id = data.id || uuid();
		this.setStatus(data.status || {});
		this.setSettings(data.settings || {});
		this.setInfo(data.info || {});

		this.relayOn = this.relayOn.bind(this);
		this.relayEmit = this.relayEmit.bind(this);

		// Socket connection to relay. This must come before creating services.
		this.relaySocket = createDeviceSocket(this.id);
		this.listenToRelay();

		// The socket must be created before creating services.
		this.services = new ServicesManager(data.services, this);
		this.services.setRelaySocket(this.getRelaySocketProxy());
	}

	setStatus (status) {
		this.status = {
			connected: status.connected || false
		};
	}

	setSettings (settings) {
		this.settings = {
			name:  settings.name
		};
	}

	setInfo (info) {
		this.info = {
			manufacturer: info.manufacturer
		};
	}

	listenToRelay () {
		this.relaySocket.on('connect', () => { this.onRelayConnect(); });
		this.relaySocket.on('disconnect', () => { this.onRelayDisconnect(); });

		// Receive the token needed for this device to communicate with relay.
		this.relaySocket.on('token', (data) => {
			this.token = data.token;

			// Send current state of device to relay.
			this.relayEmit('load', this.relaySerialize());
		});
	}

	onRelayConnect () {
		this.status.connected = true;

		// Handshake with relay. Relay should respond with a 'token' event.
		// This first emit is the only time we should not use this.relayEmit.
		this.relaySocket.emit('gateway/device/connect', {device_id: this.id});
	}

	onRelayDisconnect () {
		this.status.connected = false;
	}

	relayOn () {
		return this.relaySocket.on.apply(this.relaySocket, arguments);
	}

	relayEmit (event, data, callback) {
		if (!this.status.connected || !this.token) {
			console.log(TAG, this.id, 'Attempted to emit "' + event + '" event to relay, but the connection is down or the device has no token.');
			return;
		}

		return this.relaySocket.emit(event, {...data, token: this.token}, callback);
	}

	getRelaySocketProxy () {
		return {
			on: this.relayOn,
			emit: this.relayEmit
		};
	}

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
