const utils = require('../utils.js'),
	uuid = require('uuid/v4');

class Service {
	constructor (data) {
		this.id = data.id || uuid();
		this.type = data.type;
		this.device = data.device;
		this.settings = {};
		this.stateListeners = [];

		this.setState({});
	}

	onStateChange (listener) {
		// Add state listener to list of listeners.
		this.stateListeners.push(listener);
	}

	setState (state = {}) {
		// On state change, send updated state to state listeners.
		this.state = utils.onChange({...state}, () => {
			this.stateListeners.forEach((listener) => listener(this.state));
		});
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
