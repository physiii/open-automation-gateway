const ServiceApi = require('./service-api.js'),
  TAG = '[LightApi]';

class LightApi extends ServiceApi {
  constructor (socket, light) {
    super(socket, light, 'light');

    this.light = light;
    this.listen();
  }

  listen () {
    this.on('lightOn/set', (data, callback) => {
      this.light.lightOn();
      callback(null, {});
    });

    this.on('lightOff/set', (data, callback) => {
      console.log(TAG,"Recieved Call...")
      this.light.lightOff();
      callback(null, {});
    });

    this.on('brightness/set', (data, callback) => {
      this.light.setBrightness(data.brightness);
      callback(null, {});
    });

    this.on('color/set', (data, callback) => {
      this.light.setColor(data.color);
      callback(null, {});
    });

    this.on('name/set', (data, callback) => {
      this.light.setLightName(data.name);
      callback(null, {});
    });
    
    this.on('fade/up/set', (data, callback) => {
      this.light.startFadeUp();
      callback(null, {});
    });
    
    this.on('fade/down/set', (data, callback) => {
      this.light.startFadeDown();
      callback(null, {});
    });
    
    this.on('fade/remove', (data, callback) => {
      this.light.setLightName();
      callback(null, {});
    });

  }
}

module.exports = LightApi;
