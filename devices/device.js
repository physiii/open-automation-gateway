const uuid = require('uuid/v4'),
	database = require('../database.js'),
	createDeviceSocket = require('./device-socket.js').createDeviceSocket,
	ServicesManager = require('../services/services-manager.js'),
	noOp = () => {},
	TAG = '[Device]';

class Device {
	constructor (data) {
		this.id = data.id || uuid();
		this.token = data.token || this.id; // The token is the device ID by default until the relay assigns a token.
		this.dependencies = data.dependencies || {};
		this.relay_listeners = [];

		this.setState(data.state);
		this.setSettings(data.settings);
		this.setInfo(data.info);

		this.services = new ServicesManager(data.services, this.getRelaySocketProxy(), this);

		this.connectToRelay = this.connectToRelay.bind(this);

		this.connectToRelay();
	}

	setState (state = {}) {
		this.state = {
			connected: state.connected || false
		};
	}

	setSettings (settings = {}) {
		this.settings = {
			name: settings.name
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

			this.save().then(() => resolve()).catch(() => {
				this.token = current_token;

				reject('There was an error storing the new token.');
			});
		});
	}

	connectToRelay () {
		if (this.relay_socket) {
			this.relay_socket.disconnect();
			this.relay_socket.removeAllListeners();
		}

		this.relay_socket = createDeviceSocket(this.id, this.token);

		// Set up relay listeners on new socket.
		this.relay_listeners.forEach((listener) => {
			this.relay_socket.on.apply(this.relay_socket, listener);
		});

		this.relay_socket.on('connect', () => {
			this.state.connected = true;
			this.sendCurrentStateToRelay();
		});
		this.relay_socket.on('disconnect', () => this.state.connected = false);
		this.relay_socket.on('token', (data, callback = noOp) => {
			this.setToken(data.token).then(() => {
				callback(null, {});
			}).catch((error) => {
				callback(error);
			});
		});
		this.relay_socket.on('reconnect-to-relay', this.connectToRelay);
	}

	sendCurrentStateToRelay () {
		this.relay_socket.emit('load', {device: this.relaySerialize()});
	}

	getRelaySocketProxy () {
		return {
			on: (function () {
				this.relay_listeners.push(arguments);

				if (this.relay_socket) {
					this.relay_socket.on.apply(this.relay_socket, arguments);
				}
			}).bind(this),
			emit: (function (event, data, callback) {
				if (!this.state.connected) {
					console.log(TAG, this.id, 'Attempted to emit "' + event + '" event to relay, but the relay socket is not connected.');
					return;
				}

				return this.relay_socket.emit(event, data, callback);
			}).bind(this)
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
