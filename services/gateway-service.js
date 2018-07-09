const exec = require('child_process').exec,
	Service = require('./service.js'),
	config = require('../config.json'),
	DevicesManager = require('../devices/devices-manager.js'),
	TAG = '[GatewayService]';

class GatewayService extends Service {
	constructor (data) {
		super(data);

		this.searchForAndCreateDevices();
	}

	getDevices () {
		return DevicesManager.getDevices();
	}

	searchForAndCreateDevices () {
		this.getOsCamerasList().then((camera_device_paths) => {
			this.createDevicesForOsCameras(camera_device_paths);
		}).catch((error) => console.error(TAG, 'There was an error getting the list of cameras available to the operating system.', error));
	}

	createDevicesForOsCameras (device_paths = []) {
		const new_devices = [],
			camera_services = DevicesManager.getServicesByType('camera');

		return new Promise((resolve, reject) => {
			device_paths.forEach((device_path) => {
				if (camera_services.find((camera_service) => camera_service.os_device_path === device_path)) {
					return;
				}

				DevicesManager.createDevice({
					settings: {
						name: 'Gateway Camera'
					},
					info: {
						manufacturer: config.manufacturer
					},
					services: [
						{
							type: 'camera',
							os_device_path: device_path
						}
					]
				}).then((new_device) => {
					new_devices.push(new_device);
				});
			});

			resolve(new_devices);
		});
	}

	getOsCamerasList () {
		return new Promise((resolve, reject) => {
			exec('ls -lah --full-time /dev/video*', (error, stdout, stderr) => {
				if (error) {
					reject(error);
					return;
				}

				const stdout_parts = stdout.split(/(?:\r\n|\r|\n| )/g),
					cameras = [];

				for (var i = 0; i < stdout_parts.length - 1; i++) {
					let stdout_part = stdout_parts[i];

					// Not a video device path.
					if (stdout_part.indexOf('/dev/video') < 0) continue;

					let camera = stdout_part,
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

module.exports = GatewayService;