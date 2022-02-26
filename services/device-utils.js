const exec = require('child_process').exec,
	ConnectionManager = require('./connection.js'),
	config = require('../config.json'),
	axios = require('axios'),
	Exec = require('child_process').exec,
	v3 = require('node-hue-api').v3,
  discovery = v3.discovery,
  hueApi = v3.api,
	appName = 'oa',
	deviceName = 'gateway',
	DevicesManager = require('../devices/devices-manager.js'),
	Database = require ("../services/database.js"),
	NewSchedule = [
			{label: '1 AM', value: 1, minTemp: 65, maxTemp: 75, power: true},
			{label: '2 AM', value: 2, minTemp: 65, maxTemp: 75, power: true},
			{label: '3 AM', value: 3, minTemp: 65, maxTemp: 75, power: true},
			{label: '4 AM', value: 4, minTemp: 65, maxTemp: 75, power: true},
			{label: '5 AM', value: 5, minTemp: 65, maxTemp: 75, power: true},
			{label: '6 AM', value: 6, minTemp: 65, maxTemp: 75, power: true},
			{label: '7 AM', value: 7, minTemp: 65, maxTemp: 75, power: true},
			{label: '8 AM', value: 8, minTemp: 65, maxTemp: 75, power: true},
			{label: '9 AM', value: 9, minTemp: 65, maxTemp: 75, power: true},
			{label: '10 AM', value: 10, minTemp: 65, maxTemp: 75, power: true},
			{label: '11 AM', value: 11, minTemp: 65, maxTemp: 75, power: true},
			{label: '12 AM', value: 12, minTemp: 65, maxTemp: 75, power: true},
			{label: '1 PM', value: 13, minTemp: 65, maxTemp: 75, power: true},
			{label: '2 PM', value: 14, minTemp: 65, maxTemp: 75, power: true},
			{label: '3 PM', value: 15, minTemp: 65, maxTemp: 75, power: true},
			{label: '4 PM', value: 16, minTemp: 65, maxTemp: 75, power: true},
			{label: '5 PM', value: 17, minTemp: 65, maxTemp: 75, power: true},
			{label: '6 PM', value: 18, minTemp: 65, maxTemp: 75, power: true},
			{label: '7 PM', value: 19, minTemp: 65, maxTemp: 75, power: true},
			{label: '8 PM', value: 20, minTemp: 65, maxTemp: 75, power: true},
			{label: '9 PM', value: 21, minTemp: 65, maxTemp: 75, power: true},
			{label: '10 PM', value: 22, minTemp: 65, maxTemp: 75, power: true},
			{label: '11 PM', value: 23, minTemp: 65, maxTemp: 75, power: true},
			{label: '12 PM', value: 24, minTemp: 65, maxTemp: 75, power: true}
	],
	TAG = '[DeviceUtils]';

class DeviceUtils {

	createSirenService (gpio_paths = []) {
		const new_devices = [],
			siren_services = DevicesManager.getServicesByType('siren');

		return new Promise((resolve, reject) => {
			gpio_paths.forEach((gpio_path) => {
				if (siren_services.find((siren_service) => siren_service.gpio === gpio_path)) {
					return;
				}

				DevicesManager.createDevice({
					settings: {
						name: 'Siren'
					},
					info: {
						manufacturer: config.manufacturer
					},
					services: [
						{
							type: 'siren',
							gpio: gpio_path
						}
					]
				}).then((new_device) => {
					new_devices.push(new_device);
				});
			});

			resolve(new_devices);
		});
	}

	createContactService (gpio_paths = []) {
		const new_devices = [],
			contact_services = DevicesManager.getServicesByType('contact_sensor');

		return new Promise((resolve, reject) => {
			gpio_paths.forEach((gpio_path) => {
				if (contact_services.find((contact_service) => contact_service.gpio === gpio_path)) {
					return;
				}

				DevicesManager.createDevice({
					settings: {
						name: 'Contact Sensor'
					},
					info: {
						manufacturer: config.manufacturer
					},
					services: [
						{
							type: 'contact-sensor',
							gpio: gpio_path
						}
					]
				}).then((new_device) => {
					new_devices.push(new_device);
				});
			});

			resolve(new_devices);
		});
	}

	createDevicesForOsCameras (device_paths = []) {
		const new_devices = [],
			camera_services = DevicesManager.getServicesByType('camera');

		return new Promise((resolve, reject) => {
			device_paths.forEach((device_path) => {
				if (camera_services.find((camera_service) => camera_service.os_device_path === device_path)) {
					return;
				} else {
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
				}
			});

			resolve(new_devices);
		});
	}

	createNetworkCameraService (device_paths) {
		console.log("createNetworkCameraService", device_paths);
		const new_devices = [],
			camera_services = DevicesManager.getServicesByType('camera');

		return new Promise((resolve, reject) => {
			device_paths.forEach((device_path) => {
				console.log("createNetworkCameraService", device_path);
				if (camera_services.find((camera_service) => camera_service.network_path === device_path)) {
					return;
				} else {
					DevicesManager.createDevice({
						settings: {
							name: 'Network Camera'
						},
						info: {
							manufacturer: config.manufacturer
						},
						services: [
							{
								type: 'network-camera',
								network_path: 'rtsp://' + device_path + ':554/stream1'  // rtsp://192.168.1.15:554/stream1
							}
						]
					}).then((new_device) => {
						new_devices.push(new_device);
					});
				}
			});

			resolve(new_devices);
		});
	}

	getOsCamerasList () {
		return new Promise((resolve, reject) => {
			exec('ls -lah --full-time /dev/video0', (error, stdout, stderr) => {
				if (error) {
					// reject(error);
					// return;
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

	searchForAndCreateDevices () {
		this.getOsCamerasList()
		.then((camera_device_paths) => {
			this.createDevicesForOsCameras(camera_device_paths);
		}).catch((error) => console.error(TAG, 'There was an error getting the list of cameras available to the operating system.', error));

		// this.searchForNetworkThermostats();
	}

	createThermostatService (ip) {
		let devices = DevicesManager.getDevices(),
			found = false;

		for (let i = 0; i < devices.length; i++) {
			let services = devices[i].services.services;
			for (let j = 0; j < services.length; j++) {
				if (services[j].ip == ip) {
					found = true;
				}
			}
		}

		if (!found) {
			console.log(TAG, 'CREATING THERMOSTAT !! ', ip);
			DevicesManager.createDevice({
				settings: {name: 'Thermostat'},
				services: [{type: 'thermostat', ip, schedule: NewSchedule, hold: { mode:'off', minTemp:65, maxTemp:75 }, power: false }]
			})
		}
	}

	searchForNetworkThermostats () {
		ConnectionManager.getLocalIP()
		.then((localIps) => {
			let ip_base = localIps[0].substring(0, localIps[0].lastIndexOf('.') + 1);
			for (let i = 1; i <= 255; i++) {
				let ip = ip_base + i,
					self = this;
				axios.get('http://' + ip + '/tstat')
					.then(function (response) {
						if (response.data.temp) {
							self.createThermostatService(ip);
						}
					})
					.catch(function (error) {})
			}
		})
	}

	searchForNetworkCameras () {
		ConnectionManager.getLocalIP()
		.then((localIps) => {
			let ip_base = localIps[0].substring(0, localIps[0].lastIndexOf('.') + 1),
				cmd = "nmap --script rtsp-url-brute -p 554 " + ip_base + "1/24 | grep open -B4 | grep report";

			Exec(cmd, (error, stdout, stderr) => {
			  if (error) {
			    return;
			  }
				let lines = stdout.split("\n"),
					ips = [];

				for (let i = 0; i < lines.length; i++) {
					let line = lines[i].split(" "),
						ip = line[line.length - 1].replace("\n", "");

					if (ip.split(".").length == 4) ips.push(ip);
				}

				this.createNetworkCameraService(ips);
			});
		})
	}

	searchForHueBridges () {
		this.discoverAndCreateUser().then((bridge) => {
			console.log("CREATING HUE BRIDGE DEVICE:", bridge);
			DevicesManager.createDevice({
				settings: {name: 'Hue Bridge'},
				services: [{type: 'hue_bridge', ip:bridge.ip, user:bridge.user, bridge_id: bridge.user}]
			})
		})
	}

	async discoverBridge() {
	  const discoveryResults = await discovery.nupnpSearch();

	  if (discoveryResults.length === 0) {
	    console.error('Failed to resolve any Hue Bridges');
	    return null;
	  } else {
	    // Ignoring that you could have more than one Hue Bridge on a network as this is unlikely in 99.9% of users situations
	    return discoveryResults[0].ipaddress;
	  }
	}

	async discoverAndCreateUser () {
		const ipAddress = await this.discoverBridge();

	  // Create an unauthenticated instance of the Hue API so that we can create a new user
	  const unauthenticatedApi = await hueApi.createLocal(ipAddress).connect();

	  let createdUser;
	  try {
	    createdUser = await unauthenticatedApi.users.createUser(appName, deviceName);
	    console.log('*******************************************************************************\n');
	    console.log('User has been created on the Hue Bridge. The following username can be used to\n' +
	                'authenticate with the Bridge and provide full local access to the Hue Bridge.\n' +
	                'YOU SHOULD TREAT THIS LIKE A PASSWORD\n');
	    console.log(`Hue Bridge User: ${createdUser.username}`);
	    console.log(`Hue Bridge User Client Key: ${createdUser.clientkey}`);
	    console.log('*******************************************************************************\n');

	    // Create a new API instance that is authenticated with the new user we created
	    const authenticatedApi = await hueApi.createLocal(ipAddress).connect(createdUser.username);

	    // Do something with the authenticated user/api
	    const bridgeConfig = await authenticatedApi.configuration.getConfiguration();
	    console.log(`Connected to Hue Bridge: ${bridgeConfig.name} :: ${bridgeConfig.ipaddress}`);
			let bridge = {ip:bridgeConfig.ipaddress, user:createdUser.username};
			return bridge;
	  } catch(err) {
	    if (err.getHueErrorType() === 101) {
	      console.error('The Link button on the bridge was not pressed. Please press the Link button and try again.');
	    } else {
	      console.error(`Unexpected Error: ${err.message}`);
	    }
	  }
	}

	getDevices () {
		return DevicesManager.getDevices();
	}
}

module.exports = new DeviceUtils();
