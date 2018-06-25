const ServiceApi = require('./service-api.js');

class LightApi extends ServiceApi {
  constructor (socket, light) {
    super(socket, light.id, 'light');

    this.light = light;
    this.listen();
  }

  listen () {

    this.on('light/lightOn', (data, callback) => {
      this.light.lightOn();
      callback(null, {});
    });

    this.on('light/lightOff', (data, callback) => {
      this.light.lightOff();
      callback(null, {});
    });

    this.on('light/brightness/set', (data, callback) => {
      this.light.setBrightness(data.brightness);
      callback(null, {});
    });

    this.on('light/color/set', (data, callback) => {
      this.light.setColor(data.color);
      callback(null, {});
    });

    this.on('light/name/set', (data, callback) => {
      this.light.setLightName(data.name);
      callback(null, {});
    });

  }
}

module.exports = LightApi;
