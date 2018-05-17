const uuid = require('uuid/v4'),
	services = require('../services/services.js');

class Device {
	constructor (data) {
		this.id = data.id || uuid();
		this.settings = {
			name: data.settings && data.settings.name
		};
		this.info = {
			manufacturer: data.info && data.info.manufacturer
		};

		if (Array.isArray(data.services)) {
			this.services = data.services.map((service) => services.createService(service, this));
		} else {
			this.services = [];
		}
	}

	dbSerialize () {
		return {
			id: this.id,
			settings: this.settings,
			info: this.info,
			services: this.services.map((service) => service.dbSerialize()),
		};
	}
}

module.exports = Device;
