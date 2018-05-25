const Service = require('./service.js'),
	GatewayService = require('./gateway-service.js'),
	GatewayApi = require('./api/gateway-api.js'),
	CameraService = require('./camera-service.js'),
	CameraApi = require('./api/camera-api.js'),
	LockService = require('./lock-service.js'),
	ThermostatService = require ('./thermostat-service.js'),
	ThermostatWifiDriver = require ('./drivers/thermostat-wifi.js'),
	ZwaveLockDriver = require('./drivers/lock-zwave.js');

class ServicesManager {
	constructor (services = [], device) {
		this.device = device;
		this.services = [];

		this.addServices(services);
	}

	addService (data) {
		let service = this.getServiceById(data.id);

		if (service) {
			return service;
		}

		switch (data.type) {
			case 'gateway':
				service = new GatewayService(data);
				break;
			case 'camera':
				service = new CameraService(data);
				break;
			case 'lock':
				service = new LockService(data, ZwaveLockDriver);
				break;
			case 'thermostat':
				service = new ThermostatService(data, ThermostatWifiDriver);
				break;
			default:
				service = new Service(data);
				break;
		}

		service.device = this.device;
		this.services.push(service);

		return service;
	}

	addServices (services) {
		services.forEach((service) => {
			this.addService(service);
		});
	}

	setRelaySocket (socket) {
		this.services.forEach((service) => {
			switch (service.type) {
				case 'gateway':
					new GatewayApi(socket, service);
					break;
				case 'camera':
					new CameraApi(socket, service);
					break;
				case 'lock':
					break;
			}
		});
	}

	getServiceById (serviceId) {
		return this.services.find((service) => service.id === serviceId);
	}

	getDbSerializedServices () {
		return this.services.map((service) => service.dbSerialize());
	}
}

module.exports = ServicesManager;
