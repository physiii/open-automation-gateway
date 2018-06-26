const uuid = require('uuid/v4'),
	crypto = require('crypto'),
	createDeviceSocket = require('./device-socket.js').createDeviceSocket,
	ServicesManager = require('../services/services-manager.js'),
	TAG = '[Device]';

class Device {
	constructor (data) {
		this.id = data.id || uuid();
		this.token = data.token || crypto.randomBytes(256).toString('hex');
		this.setState(data.state);
		this.setSettings(data.settings);
		this.setInfo(data.info);

		this.relayOn = this.relayOn.bind(this);
		this.relayEmit = this.relayEmit.bind(this);

		// Socket connection to relay. This must come before creating services.
		this.relaySocket = createDeviceSocket(this.id, this.token);
		this.listenToRelay();

		// The socket must be created before creating services.
		this.services = new ServicesManager(data.services, this);
		this.services.setRelaySocket(this.getRelaySocketProxy());
	}

	setState (state = {}) {
		this.state = {
			connected: state.connected || false
		};
	}

	setSettings (settings = {}) {
		this.settings = {
			name:  settings.name
		};
	}

	setInfo (info = {}) {
		this.info = {
			manufacturer: info.manufacturer
		};
	}

	listenToRelay () {
		this.relaySocket.on('connect', () => { this.onRelayConnect(); });
		this.relaySocket.on('disconnect', () => { this.onRelayDisconnect(); });
	}

	sendCurrentStateToRelay () {
		this.relayEmit('load', {device: this.relaySerialize()});
	}

	onRelayConnect () {
		this.state.connected = true;
		this.sendCurrentStateToRelay();
	}

	onRelayDisconnect () {
		this.state.connected = false;
	}

	relayOn () {
		return this.relaySocket.on.apply(this.relaySocket, arguments);
	}

	relayEmit (event, data, callback) {
		if (!this.state.connected) {
			console.log(TAG, this.id, 'Attempted to emit "' + event + '" event to relay, but the relay socket is not connected.');
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
			info: this.info
		};
	}

	dbSerialize () {
		return {
			...this.serialize(),
			token: this.token,
			services: this.services.getDbSerializedServices()
		};
	}

	relaySerialize () {
		return {
			...this.serialize(),
			state: this.state,
			services: this.services.getRelaySerializedServices()
		};
	}
}

module.exports = Device;
