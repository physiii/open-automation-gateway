const ServiceApi = require('./service-api.js');

class DeadboltApi extends ServiceApi {
  constructor (socket, deadbolt) {
    super(socket, deadbolt.id, 'deadbolt');

    this.deadbolt = deadbolt;
    this.listen();
  }

  listen () {
    return;
  }
}

module.exports = DeadboltApi;
