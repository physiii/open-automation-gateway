const Service = require('./service.js'),
	GatewayService = require('./gateway-service.js'),
	CameraService = require('./camera-service.js'),
	ThermostatService = require('./thermostat-service.js'),
	LockService = require('./lock-service.js'),
	LightService = require('./light-service.js'),
	HueBridgeService = require('./hue-bridge-service.js');

class ServicesManager {
	constructor (services = [], relay_socket, device) {
		this.relay_socket = relay_socket;
		this.device = device;
		this.services = [];

		this.addServices(services);
	}

	addService (data) {
		let service = this.getServiceById(data.id),
			service_class;

		if (service) {
			return service;
		}

		switch (data.type) {
			case 'gateway':
				service_class = GatewayService;
				break;
			case 'hue_bridge':
				service_class = HueBridgeService;
				break;
			case 'camera':
				service_class = CameraService;
				break;
			case 'lock':
				service_class = LockService;
				break;
			case 'thermostat':
				service_class = ThermostatService;
				break;
			case 'light':
				service_class = LightService;
				break;
			default:
				service_class = Service;
				break;
		}

		service = new service_class(data, this.relay_socket);

		service.device = this.device;
		this.services.push(service);

		return service;
	}

	addServices (services) {
		services.forEach((service) => {
			this.addService(service);
		});
	}

	getServiceById (serviceId) {
		return this.services.find((service) => service.id === serviceId);
	}

	hasServiceWithType (serviceType) {
		return Boolean(this.services.find((service) => service.type === serviceType));
	}

	getServicesByType (serviceType) {
		return this.services.filter((service) => service.type === serviceType);
	}

	getSerializedServices () {
		return this.services.map((service) => service.serialize());
	}

	getDbSerializedServices () {
		return this.services.map((service) => service.dbSerialize());
	}

	getRelaySerializedServices () {
		return this.services.map((service) => service.relaySerialize());
	}
}

module.exports = ServicesManager;
