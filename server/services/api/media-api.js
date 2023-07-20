const ServiceApi = require('./service-api.js');

class MediaApi extends ServiceApi {
	listen () {
		ServiceApi.prototype.listen.call(this);

		this.on('state/set', (data, callback) => {
			this.service.setVolume(data.mode);
			callback(null, {});
		})

		this.on('level/set', (data, callback) => {
			this.service.setVolume(data.level);
			callback(null, {});
		})

		this.on('click/set', (data, callback) => {
			this.service.setClickCoords(data.coords);
			callback(null, {});
		})

		this.on('coords/set', (data, callback) => {
			this.service.setCoords(data.coords);
			callback(null, {});
		})

		this.on('mute', (data, callback) => {
			this.service.mute();
			callback(null, {});
		})

		this.on('pause', (data, callback) => {
			console.log('PAUSE');
			this.service.pause();
			callback(null, {});
		})

		this.on('prev', (data, callback) => {
			this.service.prev();
			callback(null, {});
		})

		this.on('next', (data, callback) => {
			this.service.next();
			callback(null, {});
		})
	}
}

module.exports = MediaApi;
