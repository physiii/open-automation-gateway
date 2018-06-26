const ServiceApi = require('./service-api.js');

class ThermostatApi extends ServiceApi {
  constructor (socket, thermostat) {
    super(socket, thermostat, 'thermostat');

    this.thermostat = thermostat;
    this.listen();
  }

  listen () {

    this.on('mode/set', (data, callback) => {
      this.thermostat.setThermostatMode(data.mode);
      callback(null, {});
    })

    this.on('temp/set', (data, callback) => {
      this.thermostat.setTemp(data.temp);
      callback(null, {});
    });

    this.on('fanMode/set', (data, callback) => {
      this.thermostat.setFanMode(data.mode);
      callback(null, {});
    });

    this.on('holdMode/set', (data, callback) => {
      this.thermostat.setHoldMode(data.mode);
      callback(null, {});
    });
  }
}

module.exports = ThermostatApi;
