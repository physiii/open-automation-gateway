const Service = require('./service.js'),
  hue = require ('node-hue-api'),
  HueApi = hue.HueApi,
  lightState = hue.lightState,
  TAG = '[hue-bridge-service.js]';

class HueBridgeService extends Service {
  constructor (data) {
    super(data);

    this.id = data.id || '';
    this.user = data.user || 'CbJnDROdyKEfqjlfTJvsm8VXaqxUguGrD-9O5Plk';

    this.api = new HueApi(this.ip, this.user);
    this.state = lightState.create();

  }

  findAttachedLights () {
    this.api.lights(function(err, lights) {
      if (err) {
        throw err;
      };
      console.log(lights);
    });
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
