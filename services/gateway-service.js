const exec = require('child_process').exec,
	Service = require('./service.js'),
	devices = require('../devices/devices-manager.js'),
	TAG = '[GatewayService]';

class GatewayService extends Service {
	constructor (data) {
		super(data);
	}

	addDevice (data) {
		return devices.addDevice(data);
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

module.exports = GatewayService;
