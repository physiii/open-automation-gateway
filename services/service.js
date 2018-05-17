const uuid = require('uuid/v4');

class Service {
	constructor (data) {
		this.id = data.id || uuid();
		this.type = data.type;
		this.device = data.device;
		this.settings = {};
	}

	dbSerialize () {
		return {
			id: this.id,
			type: this.type,
			settings: this.settings
		};
	}
}

module.exports = Service;
