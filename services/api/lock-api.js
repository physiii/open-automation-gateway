const ServiceApi = require('./service-api.js');

class LockApi extends ServiceApi {
	constructor (socket, lock) {
		super(socket, lock, 'lock');

		this.lock = lock;
		this.listen();
	}

	listen () {
		this.on('lock/set', (data, callback) => {
			this.lock.lock();

			callback(null, {});
		});

		this.on('unlock/set', (data, callback) => {
			this.lock.unlock();

			callback(null, {});
		});

		this.on('relockDelay/set', (data, callback) => {
			this.lock.setRelockDelay(data.relock_delay);

			callback(null, {});
		});
	}
}

module.exports = LockApi;
