// -----------------------------  OPEN-AUTOMATION ------------------------- //
// ------------  https://github.com/physiii/open-automation --------------- //
// --------------------------------- Gateway ------------------------------ //

software_version = '0.2';
var TAG = '[index.js]';

// ----------------------------------------------------- //
// import config or create new config.json with defaults //
// ----------------------------------------------------- //
const fs = require('fs');

let config = {
  relay_server: '127.0.0.1',
  relay_port: 5000
};

try {
  config = require('./config.json');
} catch (e) {
  let config_str = JSON.stringify(config).replace(',', '\,\n  ');

  config_str = config_str.replace('{', '{\n  ').replace('}', '\n}');

  fs.writeFile(__dirname + '/config.json', config_str, (error) => {
    if (error) {
      throw error;
    }

    console.log(TAG, 'created config.json');
  });
}

const utils = require('./utils'),
  connection = require('./connection.js'),
  database = require('./database'),
  devices = require('./devices/devices-manager.js');

if (config.zwave) {
  zwave = require('./zwave.js');
}
require('./admin.js');

// Get settings and load devices from database.
database.get_settings().then((settings) => {
  devices.loadDevicesFromDb().then(() => {
    let main_device = devices.getDeviceById(settings.main_device_id);

    // If the default device has not been created yet, create it.
    if (!main_device) {
      main_device = devices.addDevice({
          services:[
            {type: 'gateway'}
          ]
      });

console.log('CREATED MAIN DEVICE', main_device.id);

      settings.main_device_id = main_device.id;
console.log('STORE SETTINGS', settings);
      database.store_settings(settings);
    }
  });
});

function main_loop () {
  var settings_obj = {
    public_ip: connection.public_ip,
    local_ip: connection.local_ip,
    mac: utils.mac,
    disk: utils.disk
  };

  database.store_settings(settings_obj);
  var settings = database.settings;

  // if (database.settings.ap_mode) {
  //   ap_time = Date.now() - ap_time_start;

  //   console.log('ap_time', ap_time);

  //   if (ap_time > 10 * 60 * 1000) {
  //     console.log('Trying wifi again...');

  //     set_wifi_from_db();
  //     exec('sudo reboot');
  //   }
  // }

  connection.get_public_ip();
  connection.scan_wifi();
}

main_loop();
setInterval(main_loop, 30 * 1000);
