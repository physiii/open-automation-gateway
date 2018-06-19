const ServiceApi = require('./service-api.js');

class LockApi extends ServiceApi {
  constructor (socket, lock) {
    super(socket, lock.id, 'lock');

    this.lock = lock;
    this.listen();
  }

  listen () {
    this.on('lock/setlock', (data, callback) => {
      this.lock.lock();
      callback(null, {});
    });

    this.on('lock/setunlock', (data, callback) => {      
      this.lock.unlock();
      callback(null, {});
    });
  }
}

module.exports = LockApi;
