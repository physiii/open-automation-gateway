const Service = require('./service.js'),
	GatewayService = require('./gateway-service.js'),
	GatewayApi = require('./api/gateway-api.js'),
	CameraService = require('./camera-service.js'),
	CameraApi = require('./api/camera-api.js'),
	ThermostatService = require ('./thermostat-service.js'),
	ThermostatApi = require('./api/thermostat-api.js'),
	ThermostatWifiDriver = require ('./drivers/thermostat-wifi.js'),
	LockService = require('./lock-service.js'),
	LockApi = require('./api/lock-api.js'),
	ZwaveLockDriver = require('./drivers/lock-zwave.js'),
	LightService = require('./light-service.js'),	L
	LightApi = require('./api/light-api.js'),
	LightHueDriver = require('./drivers/light-hue.js')

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
			case 'light':
				service = new LightService(data, LightHueDriver);
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
					new LockApi(socket, service);
					break;
				case 'thermostat':
					new ThermostatApi(socket, service);
					break;
				case 'light':
					new LightApi(socket, service);
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
