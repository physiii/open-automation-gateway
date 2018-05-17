const exec = require('child_process').exec,
	database = require('../database.js'),
	Device = require('./device.js');

class Devices {
	constructor () {
		this.devices = [];
	}

	loadDevicesFromDb () {
		database.get_devices().then((devices) => {
			this.devices = devices.map((device) => new Device(device));
		})
	}

	getDbSerializedDevices () {
		return this.devices.map((device) => device.dbSerialize());
	}

	getDeviceByServiceId (serviceId) {
		return this.devices.find((device) => {
			return device.services.find((service) => (service.id === serviceId));
		});
	}

	getOsCamerasList () {
		return new Promise((resolve, reject) => {
			exec('ls -lah --full-time /dev/video*', (error, stdout, stderr) => {
				if (error) {
					reject(error);
					return;
				}

				const cameras = [];

				let stdout_parts = stdout.split(/(?:\r\n|\r|\n| )/g),
					stdout_part, camera, camera_number;

				for (var i = 0; i < stdout_parts.length - 1; i++) {
					stdout_part = stdout_parts[i];

					// Not a video device path.
					if (stdout_part.indexOf('/dev/video') < 0) continue;

					camera = stdout_part;
					camera_number = camera.replace('/dev/video','');

					// Max of 10 cameras supported.
					if (Number(camera_number) > 9) continue;

					cameras.push(camera);
				}

				resolve(cameras);
			});
		});
	}
}

module.exports = new Devices();
