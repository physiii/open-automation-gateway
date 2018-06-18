const ServiceApi = require('./service-api.js');

class LockApi extends ServiceApi {
  constructor (socket, lock) {
    super(socket, lock.id, 'lock');

    this.lock = lock;
    this.listen();
  }

  listen () {
    return;
  }
}

module.exports = LockApi;
