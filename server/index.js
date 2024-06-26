const TAG = '[Index]';

try {
  id = '';
  config = require('./config.json');
} catch (e) {
	return console.log(TAG, 'No config.json file found. Start with config.json.example');
}

MINIMUM_FREE_SPACE = config.min_free_space_percent;
DISABLE_REBOOT = config.disable_reboot;
USE_DEV = config.use_dev || false;
USE_SSL = config.use_ssl || false;
RELAY_SERVER = config.relay_server || '127.0.0.1';
RELAY_PORT = config.relay_port || 5050;

const utils = require('./utils'),
  ConnectionManager = require('./services/connection.js'),
  System = require('./services/system.js'),
  Database = require('./services/database.js'),
  DevicesManager = require('./devices/devices-manager.js')
  admin = require('./services/admin.js')

if (config.zwave) {
  zwave = require('./zwave.js');
}

if (config.use_dev) {
  console.warn('Gateway is running in development mode.');
}

ConnectionManager.connectionLoop();
// Get settings and load devices from database.

console.log(TAG, "Loading devices from database.");
Database.getDevices().then((dbDevices) => {
	DevicesManager.loadDevicesFromDb().then(() => {
		createGatewayDevice = true;
    createMediaDevice = true;

		for (let i = 0; i < dbDevices.length; i++) {
			if (dbDevices[i].services[0].type == 'gateway') {
				createGatewayDevice = false;
			}
        if (dbDevices[i].services[0].type == 'media') {
				createMediaDevice = false;
			}
		}

		if (createGatewayDevice) {
			console.log(TAG, "Creating a gateway device.");
		  DevicesManager.createDevice({
		    services: [
		      {type: 'gateway'}
		    ]
		  })
		}

    if (createMediaDevice) {
      console.log(TAG, "Creating a media device.");
			DevicesManager.createDevice({
				settings: {name: 'Media'},
				services: [{type: 'media'}]
			})
    }

	});
});
