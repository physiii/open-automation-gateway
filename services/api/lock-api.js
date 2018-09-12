const ServiceApi = require('./service-api.js');

class LockApi extends ServiceApi {
	listen () {
		ServiceApi.prototype.listen.call(this);

		this.on('lock/set', (data, callback) => {
			this.service.lock();
			callback(null, {});
		});

		this.on('unlock/set', (data, callback) => {
			this.service.unlock();
			callback(null, {});
		});

		this.on('relockDelay/set', (data, callback) => {
			this.service.setRelockDelay(data.relock_delay);
			callback(null, {});
		});
	}
}

module.exports = LockApi;
