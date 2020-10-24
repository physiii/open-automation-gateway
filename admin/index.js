const express = require('express'),
	app = express(),
	path = require('path'),
	server = require('http').createServer(app),
	io = require('socket.io')(server),
	port = process.env.PORT || 3000,
	ConnectionManager = require('../services/connection.js'),
	DeviceUtils = require('../services/device-utils.js'),
	DevicesManager = require('../devices/devices-manager.js'),
	System = require('../services/system.js'),
	Database = require('../services/database.js'),
	INDEX_LOOP_TIME = 20;

let TAG = "[index]";

server.listen(port, () => {
	console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {

	socket.on('store ap', (apInfo) => {
		ConnectionManager.setWifi(apInfo);
	});

	socket.on('searchForNetworkThermostats', () => {
		console.log(TAG,"Searching for network thermostats.");
		DeviceUtils.searchForNetworkThermostats();
	});

	socket.on('searchForLocalCameras', () => {
		DeviceUtils.searchForAndCreateDevices();
	});

	socket.on('searchForHueBridges', () => {
		DeviceUtils.searchForHueBridges();
	});

	socket.on('createLedController', () => {
		createLedController();
	});

	socket.on('searchForLights', () => {
		searchForLights();
	});

	socket.on('linkLightToController', (data) => {
		linkLightToController(data);
	});

	socket.on('unlinkLightToController', (data) => {
		unlinkLightToController(data);
	});

	socket.on('removeDevice', (data) => {
		removeDevice(data);
	});

	indexLoop();
	function indexLoop() {
		ConnectionManager.scanWifi().then(function(result) {
			socket.emit('router list',result);
		}, function(err) {
				console.log(err);
		})
		setTimeout(function () {
			indexLoop();
		}, INDEX_LOOP_TIME*1000);
	}

  getDeviceList();
  function getDeviceList () {
    Database.getDevices().then(function(devices) {
        socket.emit('device list',devices);
    }, function(err) {
        console.log(err);
    })
  }

	async function removeDevice (deviceId) {
		let res = await Database.removeDevice(deviceId);
		getDeviceList();
	}

	async function searchForLights () {
		let linkedLights = await getLinkedLights();
		BridgeService = DevicesManager.getServicesByType('hue_bridge')[0];
		BridgeService.getAllLights().then((lights) => {
			let contollerArray = DevicesManager.getDevicesByServiceType('light');
			let lightServices = DevicesManager.getServicesByType('light');
			controllers = [];
			for (let i = 0; i < lightServices.length; i++) {
				let name = lightServices[i].settings.name
					? lightServices[i].settings.name
					: DevicesManager.getDeviceByServiceId(lightServices[i].id).settings.name,
					id = DevicesManager.getDeviceByServiceId(lightServices[i].id).id

				controllers[i] = { id, name };
			}
			socket.emit('light list', {lights, controllers, linkedLights});
		}, function(err) {
			console.log(err);
		})
	}

	async function getLinkedLights () {
		let lightControllers = DevicesManager.getServicesByType('light'),
			lights = [];

		for (let i = 0; i < lightControllers.length; i++ ) {
			let ids = lightControllers[i].lightIds;
			for (let j = 0; j < ids.length; j++) {
				lights.push({
					id: ids[j],
					controller: DevicesManager.getDeviceByServiceId(lightControllers[i].id).id
				});
			}
		}

		return lights;
	}

	Database.getDeviceID().then(function(device_id) {
			socket.emit('device_id',device_id);
	}, function(err) {
			console.log(err);
	})

	Database.getGatewayID().then(function(gateway_id) {
			socket.emit('gateway_id',gateway_id);
			//console.log(device_id);
	}, function(err) {
			console.log(err);
	})

	async function createLedController () {
		await DevicesManager.createDevice({
			settings: {name: 'Light Controller'},
			services: [{type: 'light', BridgeId:'', lightIds:[]}]
		})
		getDeviceList();
	}

	async function linkLightToController (data) {
		let controllerDevice = DevicesManager.getDeviceById(data.controller);

		for (let i = 0; i < controllerDevice.services.services.length; i++ ) {
			let id = controllerDevice.services.services[i].id,
				controllerService = DevicesManager.getServiceById(id);

			controllerService.bridgeUser = data.bridgeUser;

			if (!controllerService.lightIds.find((id) => id === data.lightId)) {
				controllerService.lightIds.push(data.lightId);
			}

			await controllerService.save();
			searchForLights();
		}
	}

	async function unlinkLightToController (data) {
		let controllerDevice = DevicesManager.getDeviceById(data.controller);

		for (let i = 0; i < controllerDevice.services.services.length; i++ ) {
			let id = controllerDevice.services.services[i].id,
				controllerService = DevicesManager.getServiceById(id);

			controllerService.lightIds = controllerService.lightIds.filter((id) => {
  			return data.lightId != id;
			})

			await controllerService.save();
			searchForLights();
		}
	}
});
