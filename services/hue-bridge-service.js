const Service = require('./service.js'),
  hue = require ('node-hue-api'),
  HueApi = hue.HueApi,
  lightState = hue.lightState,
  TAG = '[hue-bridge-service.js]';

class HueBridgeService extends Service {
  constructor (data) {
    super(data);

    this.ip = data.ip || '10.10.10.102'
    this.user = data.user || 'CbJnDROdyKEfqjlfTJvsm8VXaqxUguGrD-9O5Plk';

    this.api = new HueApi(this.ip, this.user);
    this.state = lightState.create();

  }

  findAttachedLights () {
    this.api.lights(function(err, lights) {
      if (err) {
        throw err;
      };
      console.log(JSON.stringify(lights));
    });
  }

  addNewLights () {
    this.api.searchForNewLights().then(() => {
      this.api.newLights()
    }).done();
  }

  setLightName (device_id, name) {
    this.api.setLightName(device_id, name, (err,result) => {
      if (err) {
        throw err;
      }
      console.log(TAG, 'Setting light' + device_id + '\'s name to ' + name);
    })
  }

  findLightState (device_id) {
    console.log(TAG, 'Finding state informaiton for ' + device_id);
    api.lightStatusWithRGB(device_id, (err, result) => {
      if (err) {
        throw err;
      }
      console.log(JSON.stringify(result));
    })
  }

  lightOn (device_id) {
    console.log(TAG, 'Set light: on');
    this.api.setLightState(device_id, this.state.on(), function(err, result) {
      if (err) {
        throw err;
      };
      console.log(TAG, result)

    })
  }

  lightOff (device_id) {
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

  dbSerialize () {
		return {
			...Service.prototype.dbSerialize.apply(this, arguments),
			ip: this.ip,
      user: this.user
		};
	}

}

module.exports = HueBridgeService;
