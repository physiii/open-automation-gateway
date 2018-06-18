const ServiceApi = require('./service-api.js');

class ThermostatApi extends ServiceApi {
  constructor (socket, thermostat) {
    super(socket, thermostat.id, 'thermostat');

    this.thermostat = thermostat;
    this.listen();
  }

  listen () {
    return;
  }
}

module.exports = ThermostatApi;
