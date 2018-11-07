const Service = require('./service.js'),
	service_classes = {
		'gateway': require('./gateway-service.js'),
		'camera': require('./camera-service.js'),
		'thermostat': require('./thermostat-service.js'),
		'lock': require('./lock-service.js'),
		'light': require('./light-service.js'),
		'hue_bridge': require('./hue-bridge-service.js'),
		'contact_sensor': require('./contact-sensor-service.js'),
		'siren': require('./siren-service.js')
	};

class ServicesManager {
	constructor (services = [], relay_socket, save) {
		this.relay_socket = relay_socket;
		this.save = save;
		this.services = [];

		this.addServices(services);
	}

	addService (data) {
		const service_class = service_classes[data.type] || Service;
		let service = this.getServiceById(data.id);

		if (service) {
			return service;
		}

		service = new service_class(data, this.relay_socket, this.save);

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
