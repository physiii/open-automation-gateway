const Service = require('./service.js'),
	CameraService = require('./camera-service.js'),
	LockService = require('./lock-service.js'),
	thermostatService = require ('./thermostat-service.js'),
	thermostatWifiDriver = require ('./thermostat-wifi.js'),
	ZwaveLockDriver = require('./drivers/lock-zwave.js');

class Services {
	constructor () {
		this.services = [];
	}

	createService (data, device) {
		let service = this.getServiceById(data.id);

		if (service) {
			return service;
		}

		switch (data.type) {
			case 'camera':
				service = new CameraService(data);
				break;
			case 'lock':
				service = new LockService(data, ZwaveLockDriver);
				break;
			case: 'thermostat':
				service = new ThermostatService(data, thermostatWifiDriver);
				break;
			default:
				service = new Service(data);
				break;
		}

		service.device = device;

		this.services.push(service);

		return service;
	}

	getServiceById (serviceId) {
		return this.services.find((service) => service.id === serviceId);
	}
}

module.exports = new Services();
