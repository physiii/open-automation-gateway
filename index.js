// -----------------------------  OPEN-AUTOMATION ------------------------- //
// ------------  https://github.com/physiii/open-automation --------------- //
// --------------------------------- Gateway ------------------------------ //

software_version = '0.2';
const TAG = '[index.js]',
  FREE_SPACE_LIMIT = 500 * 1000000;

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
  connection = require('./connection.js'),
  database = require('./database'),
  devices = require('./devices/devices-manager.js'),
  diskUsage = require('diskusage');
  admin = require('./admin/basic/index.js');

if (config.zwave) {
  zwave = require('./zwave.js');
}
//require('./admin.js');

if (config.use_dev) {
  console.warn('WARNING: Gateway is running in development mode. SSL security is compromised.');
}

// Get settings and load devices from database.
database.get_settings().then((settings) => {
  devices.loadDevicesFromDb().then(() => {
    let main_device = devices.getDeviceById(settings.main_device_id);

    // If the default device has not been created yet, create it.
    if (!main_device) {
      devices.createDevice({
        services: [
          {type: 'gateway'}
        ]
      }).then((new_main_device) => {
        database.store_settings({
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

function checkDiskSpace () {
  diskUsage.check('/', function (error, info) {
    if (error) {
      console.log(TAG, error);
      return;
    }

    module.exports.disk = {
      free: info.free,
      total: info.total
    };

    if (info.free < FREE_SPACE_LIMIT) {
      utils.removeOldCameraRecordings().then(checkDiskSpace);
    }

    console.log(TAG, 'free space:', info.free);
  });
}

function main_loop () {
  var settings = {
    public_ip: connection.public_ip,
    local_ip: connection.local_ip,
    disk: utils.disk
  };

  database.store_settings(settings);

  // if (database.settings.ap_mode) {
  //   ap_time = Date.now() - ap_time_start;

  //   console.log('ap_time', ap_time);

  //   if (ap_time > 10 * 60 * 1000) {
  //     console.log('Trying wifi again...');

  //     database.get_settings().then((db_settings) => {
  //       connection.set_wifi(db_settings);
  //     });
  //     exec('sudo reboot');
  //   }
  // }

  connection.get_public_ip();
  connection.scan_wifi();
  checkDiskSpace();
}

main_loop();
setInterval(main_loop, 30 * 1000);
