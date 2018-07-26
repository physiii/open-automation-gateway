const utils = require('../utils.js'),
	uuid = require('uuid/v4'),
	TAG = '[Service]';

class Service {
	constructor (data, relay_socket, api_class) {
		this.id = data.id || uuid();
		this.type = data.type;
		this.device = data.device;
		this.settings = {};
		this.state_listeners = [];

		// On state change, send updated state to state listeners.
		this.state = utils.onChange({...data.state}, () => {
			this.state_listeners.forEach((listener) => listener(this.state));
		});

		// Set up the Relay API.
		if (api_class) {
			const api = new api_class(relay_socket, this, this.type);

			this._relayEmit = api.emit;
		}
	}

	onStateChange (listener) {
		// Add state listener to list of listeners.
		this.state_listeners.push(listener);
	}

	relayEmit (event, data, callback) {
		if (!this._relayEmit) {
			console.error(TAG, this.id, 'Tried to emit event ' + event + ' to relay, but this service has no relay API.');
			return;
		}

		this._relayEmit(event, data, callback);
	}

	serialize () {
		return {
			id: this.id,
			type: this.type,
			settings: this.settings
		};
	}

	dbSerialize () {
		return this.serialize();
	}

	relaySerialize () {
		return {
			...this.serialize(),
			state: this.state
		};
	}
}

module.exports = Service;
