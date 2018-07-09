const uuid = require('uuid/v4'),
	database = require('../database.js'),
	createDeviceSocket = require('./device-socket.js').createDeviceSocket,
	ServicesManager = require('../services/services-manager.js'),
	TAG = '[Device]';

class Device {
	constructor (data) {
		this.id = data.id || uuid();
		this.token = data.token || this.id; // The token is the device ID by default until the relay assigns a token.
		this.dependencies = data.dependencies || {};

		this.setState(data.state);
		this.setSettings(data.settings);
		this.setInfo(data.info);

		this.services = new ServicesManager(data.services, this);

		this.relayOn = this.relayOn.bind(this);
		this.relayEmit = this.relayEmit.bind(this);

		this.setUpRelaySocket();
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

	setToken (token) {
		return new Promise((resolve, reject) => {
			const current_token = this.token;

			if (!token) {
				reject('No token provided.');

				return;
			}

			this.token = token;

			this.save().then(() => {
				resolve();
				this.setUpRelaySocket();
			}).catch(() => {
				this.token = current_token;

				reject('There was an error storing the new token.');
			});
		});
	}

	setUpRelaySocket () {
		if (this.relaySocket) {
			this.relaySocket.disconnect();
		}

		this.relaySocket = createDeviceSocket(this.id, this.token);
		this.listenToRelay();
		this.services.setRelaySocket(this.getRelaySocketProxy());
	}

	listenToRelay () {
		this.relayOn('token', (data, callback = () => {/* no-op */}) => {
			this.setToken(data.token).then(() => {
				callback(null, {});
			}).catch((error) => {
				callback(error);
			});
		});
		this.relayOn('connect', () => { this.onRelayConnect(); });
		this.relayOn('disconnect', () => { this.onRelayDisconnect(); });
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

		return this.relaySocket.emit(event, data, callback);
	}

	getRelaySocketProxy () {
		return {
			on: this.relayOn,
			emit: this.relayEmit
		};
	}

	save () {
		return new Promise((resolve, reject) => {
			database.store_device(this).then(resolve).catch(reject);
		});
	}

	serialize () {
		return {
			id: this.id,
			info: this.info,
			services: this.services.getSerializedServices()
		};
	}

	dbSerialize () {
		return {
			...this.serialize(),
			token: this.token,
			settings: this.settings,
			dependencies: this.dependencies,
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
