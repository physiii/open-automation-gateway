const ServiceApi = require('./service-api.js');

class ThermostatApi extends ServiceApi {
  constructor (socket, thermostat) {
    super(socket, thermostat.id, 'thermostat');

    this.thermostat = thermostat;
    this.listen();
  }

  listen () {
    this.on('thermostat/temp/set', (data, callback) => {
      this.thermostat.setTemp(data.temp, data.mode, data.hold);
      callback(null, {});
    });

    this.on('thermostat/fan/set', (data, callback) => {
      this.thermostat.fanMode(data.mode);
      callback(null, {});
    });    
  }
}

module.exports = ThermostatApi;
