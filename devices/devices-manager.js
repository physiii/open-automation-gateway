const database = require('../database.js'),
	Device = require('./device.js');

class Devices {
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

module.exports = new Devices();
