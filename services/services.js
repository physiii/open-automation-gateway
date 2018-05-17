const Service = require('./service.js'),
	CameraService = require('./camera-service.js');

class Services {
	constructor () {
		this.services = [];
	}

	createService (data) {
		let service = this.getServiceById(data.id);

		if (service) {
			return service;
		}

		switch (data.type) {
			case 'camera':
				service = new CameraService(data);
				break;
			default:
				service = new Service(data);
				break;
		}

		this.services.push(service);

		return service;
	}

	getServiceById (serviceId) {
		return this.services.find((service) => service.id === serviceId);
	}
}

module.exports = new Services();
