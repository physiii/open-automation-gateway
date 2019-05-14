// -----------------------------  OPEN-AUTOMATION ------------------------- //
// ------------  https://github.com/physiii/open-automation --------------- //
// --------------------------------- Gateway ------------------------------ //


const TAG = '[index.js]',
MINIMUM_FREE_SPACE = 5; //minimum free space in precent

// ----------------------------------------------------- //
// import config or create new config.json with defaults //
// ----------------------------------------------------- //
const fs = require('fs');

let config = {
  relay_server: 'localhost',
  relay_port: 5000
};

try {
  config = require('./config.json');
} catch (e) {
  fs.writeFile(__dirname + '/config.json', JSON.stringify(config, null, '  '), (error) => {
    if (error) {
      throw error;
    }

    console.log(TAG, 'created config.json');
  });
}

const utils = require('./utils'),
  ConnectionManager = require('./services/connection.js'),
  System = require('./services/system.js'),
  Database = require('./services/database.js'),
  devices = require('./devices/devices-manager.js'),
  diskUsage = require('diskusage'),
  admin = require('./admin/index.js');

if (config.zwave) {
  zwave = require('./zwave.js');
}
//require('./admin.js');

if (config.use_dev) {
  console.warn('Gateway is running in development mode.');
}

ConnectionManager.connectionLoop();
// Get settings and load devices from database.
Database.get_settings().then((settings) => {
  devices.loadDevicesFromDb().then(() => {
    let main_device = devices.getDeviceById(settings.main_device_id);

    // If the default device has not been created yet, create it.
    if (!main_device) {
      devices.createDevice({
        services: [
          {type: 'gateway'}
        ]
      }).then((new_main_device) => {
        Database.store_settings({
          ...settings,
          main_device_id: new_main_device.id
        });

        console.log('Gateway ID:', new_main_device.id);
      });
    } else {
      console.log('Gateway ID:', main_device.id);
    }
  });
});

function main_loop () {
  System.checkDiskSpace().then((info) => {
    let ratio = info.free/info.total;
    if (ratio < MINIMUM_FREE_SPACE/100) {
      utils.removeOldCameraRecordings();
    }
  });
}

main_loop();
setInterval(main_loop, 30 * 1000);
