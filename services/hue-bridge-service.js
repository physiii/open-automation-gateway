const database = require('./database.js'),
  Service = require('./service.js'),
  hue = require ('node-hue-api'),
  hueApi = hue.HueApi,
  lightState = hue.lightState,
  TAG = '[Hue.js]';

class HueBridgeService extends Service {
  constructor (data) {
    super(data);

    this.id = data.id || false;
    this.ip = data.ip || false;
    this.user = data.user || false;
    this.state = lightState.create();

    if (!this.id) {
      console.log(TAG, 'No Bridge ID found. Creating new Bridge.')
      this.linkBridge();
    } else if (!this.user) {
      console.log(TAG, "No users found. Creating user...")
      this.createUser()
    } else {
      console.log(TAG, 'Bridge exists. Connecting...')
      this.api = new HueApi(this.ip, this.user);
      this.findAttachedLights();
    }

  }

  linkBridge () {
    hue.nupnpSearch(function(err, result) {
      if (err) {
        throw err;
      };
      console.log(TAG, "Bridge not found, Configuring and Storing Bridge...");
      this.id = result[0].id;
      this.ip = result[0].ipaddress;
      this.createUser();
    });
  }

  createUser () {
    return new Promise(resolve, reject) {
      this.api = new HueApi();
      this.api.createUser(this.ip, function(err, user) {
        if (err) {
          throw err;
        };
        console.log(TAG, "Created User: " + JSON.stringify(user));
        this.user = user;
      });
      this.findAttachedLights();
      resolve();
    };
  }

  findAttachedLights () {
    return new Promise(resolve,reject) {
      this.api.lights(function(err, lights) {
        if (err) {
          throw err;
        };
        this.lights = lights;
      });
      resolve();
    };
  }

  setLightOn (device_id) {
    console.log(TAG, 'Set light: on');
    this.api.setLightState(device_id, this.state.on(), function(err, result) {
      if (err) {
        throw err;
      };
      console.log(TAG, result)

    })
  }

  setLightOff (device_id) {
    console.log(TAG, 'Set light: off');
    this.api.setLightState(device_id, this.state.off(), function(err, result) {
      if (err) {
        throw err;
      };
      console.log(TAG, result)

    })
  }

  setColor (device_id, color) {
    console.log(TAG, 'Set color');
    this.api.setLightState(device_id, this.state.rgb(color), function(err, result) {
      if (err) {
        throw err;
      };
      console.log(TAG, result)

    })
  }

  setBrightness (device_id, brightness) {
    console.log(TAG, 'Set brightness to ' + brightness);
    this.api.setLightState(device_id, this.state.brightness(brightness), function(err, result) {
      if (err) {
        throw err;
      };
      console.log(TAG, result)

    })
  }

}

module.exports = HueBridgeService;
