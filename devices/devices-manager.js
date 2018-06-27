const database = require('../database.js');

class DevicesManager {
	constructor () {
		this.devices = new Map();
	}

	addDevice (data) {
		let device = this.getDeviceById(data.id);

		if (device) {
			return device;
		}

		device = new Device(data);
		this.devices.set(device.id, device);

		return device;
	}

	createDevice (data) {
		return new Promise((resolve, reject) => {
			const device = this.addDevice(data);

			database.store_device(device).then(() => {
				resolve(device);
			}).catch(reject);
		});
	}

	getDeviceById (deviceId) {
		return this.devices.get(deviceId);
	}

	getDeviceByServiceId (serviceId) {
		return Array.from(this.devices.values()).find((device) => device.services.getServiceById(serviceId));
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
				let device;

				this.devices.clear();

				while (devices.length > 0) {
					// Get next device in the list.
					device = devices.shift();

					// If the device's dependencies are not met, add the device
					// back to the end of the devices array and move on to the
					// next device in the array.
					if (!this.areDeviceDependenciesMet(device)) {
						devices.push(device);

						continue;
					}

					this.addDevice(device);
				}

				resolve(this.devices);
			}).catch((error) => {
				reject(error);
			});
		});
	}

	areDeviceDependenciesMet (device) {
		let met = true;

		if (device.dependencies && device.dependencies.forEach) {
			device.dependencies.forEach((dependency) => {
				if (dependency.service_id && !this.getServiceById(dependency.service_id)) {
					met = false;
				}
			});
		}

		return met;
	}

	getDbSerializedDevices () {
		return Array.from(this.devices.values()).map((device) => device.dbSerialize());
	}
}

module.exports = new DevicesManager();

// The Device class needs to be required after exporting the DevicesManager
// singleton so that devices and services can require DevicesManager.
// Otherwise, the circular dependency will cause an empty object to be returned
// when they require DevicesManager.

const Device = require('./device.js');
