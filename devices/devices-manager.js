const database = require('../database.js');

class DevicesManager {
	constructor () {
		this.devices = [];
	}

	addDevice (data) {
		let device = this.getDeviceById(data.id);

		if (device) {
			return device;
		}

		device = new Device(data);
		this.devices.push(device);
		database.store_device(device);

		return device;
	}

	getDeviceById (deviceId) {
		return this.devices.find((device) => device.id === deviceId);
	}

	getDeviceByServiceId (serviceId) {
		return this.devices.find((device) => device.services.getServiceById(serviceId));
	}

	getServiceById (serviceId) {
		const device = this.getDeviceByServiceId(serviceId);

		if (!device) {
			return;
		}

		return device.services.getServiceById(serviceId);
	}

	loadDevicesFromDb () {
		return new Promise((resolve, reject) => {
			database.get_devices().then((devices) => {
				this.devices = devices.map((device) => new Device(device));
				resolve(this.devices);
			}).catch((error) => {
				reject(error);
			});
		});
	}

	getDbSerializedDevices () {
		return this.devices.map((device) => device.dbSerialize());
	}
}

module.exports = new DevicesManager();

// The Device class needs to be required after exporting the DevicesManager
// singleton so that devices and services can require DevicesManager.
// Otherwise, the circular dependency will cause an empty object to be returned
// when they require DevicesManager.

const Device = require('./device.js');
