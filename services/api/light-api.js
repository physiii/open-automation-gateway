const ServiceApi = require('./service-api.js'),
	TAG = '[LightApi]';

class LightApi extends ServiceApi {
	listen () {
		ServiceApi.prototype.listen.call(this);

		this.on('lightOn/set', (data, callback) => {
			this.service.lightOn();
			callback(null, {});
		});

		this.on('lightOff/set', (data, callback) => {
			console.log(TAG,"Recieved Call...")
			this.service.lightOff();
			callback(null, {});
		});

		this.on('brightness/set', (data, callback) => {
			this.service.setBrightness(data.brightness);
			callback(null, {});
		});

		this.on('color/set', (data, callback) => {
			console.log(TAG,'color/set',data);
			this.service.setColor(data.color);
			callback(null, {});
		});

		this.on('action', (data, callback) => {
			console.log(TAG,'action',data);
			if (data.property === 'lightOn') {
				this.service.lightOn(data.value);
			}
			if (data.property === 'incBrightness') {
				this.service.incBrightness(data.value);
			}
			if (data.property === 'decBrightness') {
				this.service.incBrightness(0-data.value);
			}
			if (data.property === 'nextScene') {
				this.service.nextScene();
			}
			if (data.property === 'triggerAlarm') {
				this.service.triggerAlarm(data.value);
			}
			if (data.property === 'setAlarm') {
				this.service.setAlarm(data.value);
			}
			if (data.property === 'color') {
				this.service.setColor(data.value);
			}
			callback(null, {});
		});

		this.on('name/set', (data, callback) => {
			this.service.setLightName(data.name);
			callback(null, {});
		});
	}
}

module.exports = LightApi;
