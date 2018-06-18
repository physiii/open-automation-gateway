const ServiceApi = require('./service-api.js');

class LockApi extends ServiceApi {
  constructor (socket, lock) {
    super(socket, lock.id, 'lock');

    this.lock = lock;
    this.listen();
  }

  listen () {
    this.on('lock/set/lock', (data, callback) => {
      this.lock.lock();
      callback(null, {});
    });

    this.on('lock/set/unlock', (data, callback) => {
      this.lock.unlock();
      callback(null, {});
    });
  }
}

module.exports = LockApi;
