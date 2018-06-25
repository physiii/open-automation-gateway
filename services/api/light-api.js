const ServiceApi = require('./service-api.js');

class LightApi extends ServiceApi {
  constructor (socket, light) {
    super(socket, light.id, 'light');

    this.light = light;
    this.listen();
  }

  listen () {
    /*
    this.on('lock/relockDelay', (data, callback) => {
      this.lock.setRelockDelay(data.relock_delay);
      callback(null, {});
    });
    */
  }
}

module.exports = LightApi;
