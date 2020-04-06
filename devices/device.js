const uuid = require('uuid/v4'),
	database = require('../services/database.js'),
	createDeviceSocket = require('./device-socket.js').createDeviceSocket,
	ServicesManager = require('../services/services-manager.js'),
	noOp = () => {},
	exec = require('child_process').exec,
	spawn = require('child_process').spawn,
	TAG = '[Device]',
	RELAY_RECONNECT_DELAY = 10000;

class Device {
	constructor (data) {
		this.save = this.save.bind(this);
		this.connectToRelay = this.connectToRelay.bind(this);

		this.id = data.id || uuid();
		this.token = data.token || this.id; // The token is the device ID by default until the relay assigns a token.
		this.dependencies = data.dependencies || {};
		this.relay_listeners = [];

		this.state = {connected: (data.state && data.state.connected) || false};
		this.settings = {...data.settings};
		this.info = {...data.info};

		this.services = new ServicesManager(data.services, this.getRelaySocketProxy(), this.save);

		this.connectToRelay();
	}

	saveSetting (property, value) {
		return new Promise((resolve, reject) => {
			const original_settings = this.settings;

			if (property === 'name') {
				this.settings.name = value;
			} else {
				resolve();
				return;
			}

			this.save().then(resolve).catch(() => {
				this.settings = original_settings;

				reject('There was an error storing the new settings.');
			});
		});
	}

	saveSettings (new_settings = this.settings) {
		return new Promise((resolve, reject) => {
			const original_settings = this.settings;

			this.settings = {
				name: new_settings.name
			};

			this.save().then(resolve).catch(() => {
				this.settings = original_settings;

				reject('There was an error storing the new settings.');
			});
		});
	}

	update () {
		return new Promise((resolve, reject) => {
				const path = __dirname + '/..',
					git = spawn('git', ['-C', path, 'pull']);

				git.stdout.on('data', (data) => {
					exec('pm2 restart camera', (error, stdout, stderr) => {
						if (error) {
							console.error(`Update: restart error: ${error}`);
							return;
						}

						console.log(stdout);
						console.log(stderr);
					});
					console.log(`Update: ${data}`);
				})
				git.stderr.on('data', (data) => console.log(`Update: error: ${data}`));

			resolve(0);
		});
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

			clearTimeout(this.reconnect_timeout);
		});
		this.relay_socket.on('disconnect', (reason) => {
			this.state.connected = false;

			if (reason === 'io server disconnect') {
				console.log(TAG, this.id, 'Reconnecting to relay in ' + (RELAY_RECONNECT_DELAY / 1000) + ' seconds.');

				this.reconnect_timeout = setTimeout(this.connectToRelay, RELAY_RECONNECT_DELAY);
			}
		});
		this.relay_socket.on('token', (data, callback = noOp) => {
			this.setToken(data.token).then(() => {
				callback(null, {});
			}).catch((error) => {
				callback(error);
			});
		});
		this.relay_socket.on('update', (data, callback = noOp) => {
			this.update().then(() => {
				callback(null, {});
			}).catch((error) => {
				callback(error);
			});
		});
		this.relay_socket.on('reconnect-to-relay', this.connectToRelay);
		this.relay_socket.on('setting', (data, callback = noOp) => {
			this.saveSetting(data.property, data.value).then(() => callback(null)).catch(callback);
		});
		this.relay_socket.on('settings', (data, callback = noOp) => {
			this.saveSettings(data.settings).then(() => callback(null)).catch(callback);
		});
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
