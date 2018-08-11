const database = require('../services/database.js'),
	utils = require('../utils.js'),
	// If a device's dependencies haven't been met after this many attempts to
	// create the device, it fails. This is also effectively the dependency
	// tree depth limit.
	DEPENDENCY_CHECK_MAX = 15,
	TAG = '[DevicesManager]';

class DevicesManager {
	constructor () {
		this.devices = new Map();
	}

	addDevice (data) {
		let device = this.getDeviceById(data.id);

		if (device) {
			return device;
		}

		if (!this.areDeviceDependenciesMet(data)) {
			return false;
		}

		device = new Device(data);
		this.devices.set(device.id, device);

		return device;
	}

	createDevice (data) {
		return new Promise((resolve, reject) => {
			const device = this.addDevice(data);

			if (!device) {
				reject();
			}

			device.save().then(() => {
				resolve(device);
			}).catch(reject);
		});
	}

	getDevices () {
		return Array.from(this.devices.values());
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

	getDevicesByServiceType (serviceType) {
		return Array.from(this.devices.values()).filter((device) => device.services.hasServiceWithType(serviceType));
	}

	getServicesByType (serviceType) {
		return utils.flattenArray(this.getDevicesByServiceType(serviceType).map((device) => {
			return device.services.getServicesByType(serviceType);
		}));
	}

	loadDevicesFromDb () {
		return new Promise((resolve, reject) => {
			database.get_devices().then((dbDevices) => {
				const dependenciesFailCounters = new Map();

				this.devices.clear();

				while (dbDevices.length > 0) {
					// Get next device in the list.
					let dbDevice = dbDevices.shift(),
						device = this.addDevice(dbDevice);

					// Device's dependencies are not met.
					if (!device) {
						let failCount = (dependenciesFailCounters.get(dbDevice.id) || 0) + 1;

						// Increment this device's dependencies check fail count.
						dependenciesFailCounters.set(dbDevice.id, failCount);

						// Add the device back to the end of the devices array.
						if (failCount < DEPENDENCY_CHECK_MAX) {
							dbDevices.push(dbDevice);
						} else {
							console.error(TAG, 'Device\'s dependencies were not satisfied after ' + failCount + ' attempts. Device was not loaded (' + dbDevice.id + ').');
						}

						// Move on to the next device in the array.
						continue;
					}
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

	getRelaySerializedDevices () {
		return Array.from(this.devices.values()).map((device) => device.relaySerialize());
	}
}

module.exports = new DevicesManager();

// The Device class needs to be required after exporting the DevicesManager
// singleton so that devices and services can require DevicesManager.
// Otherwise, the circular dependency will cause an empty object to be returned
// when they require DevicesManager.

const Device = require('./device.js');
