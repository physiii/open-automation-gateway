/*
TODO:
-Create Database storage for previous found bridges.
-Create alternate connection HueApi that checks against any pre-existing Bridges

*/
const database = require('./database.js'),
  Service = require('./service.js'),
  hue = require ('node-hue-api'),
  hueApi = require ('node-hue-api').HueApi,
  TAG = '[Hue.js]';

let device_array = database.get_devices();

class HueBridgeService extends Service {
  constructor (data) {
    super(data);

    this.linkBridge();

  }

  linkBridge () {
    hue.nupnpSearch(function(err, result) {
      if (err) {
        throw err;
      };
      let bridgeExist = false;
	    console.log(TAG, "Hue Bridges Found: "+ JSON.stringify(result));
      for (let i = 0; i < device_array.length; i++) {
        if (device_array[i].id == result[0].id) {
	         console.log(TAG, "Bridge found, establishing link...");
	         this.api = new HueApi(device_array[i].ipaddress, device_array[i].user);
           this.device = device_array[i];
	         bridgeExist = true;
        };
      };
      if (bridgeExist == false) {
        console.log(TAG, "Bridge not found, Configuring and Storing Bridge...");
        this.createUser(result[0]).then((device) => {
          this.findAttachedLights(device);
        }).then((device) => {
          storeDevice(device);
        });
      };
    });
  }

  createUser (device) {
    return new Promise(resolve, reject) {
      this.api = new HueApi();
      this.api.createUser(device.ipaddress, function(err, user) {
        if (err) {
          throw err;
        };
        console.log(TAG, "Created User: " + JSON.stringify(user));
        device.user = user;
      });
      resolve(device);
    };
  }

  findAttachedLights (device) {
    return new Promise(resolve,reject) {
      this.api.lights(function(err, lights) {
        if (err) {
          throw err;
        };
        device.lights = lights;
      });
      resolve(device);
    };
  }

  storeDevice (device) {
    this.device = device;
    device_array.push(device);
    database.store_device(device);
  }

}

module.exports = HueBridgeService;
