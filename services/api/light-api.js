const ServiceApi = require('./service-api.js'),
	TAG = '[LightApi]';

class LightApi extends ServiceApi {
	listen () {
		ServiceApi.prototype.listen.call(this);

		this.on('lightOn/set', (data, callback) => {
			console.log(TAG,"lightOn/set",data);
			this.service.lightOn();
			callback(null, {});
		});

		this.on('lightOff/set', (data, callback) => {
			console.log(TAG,"lightOff/set",data);
			console.log(TAG,"Recieved Call...")
			this.service.lightOff();
			callback(null, {});
		});

		this.on('brightness/set', (data, callback) => {
			console.log(TAG,"brightness/set",data);
			this.service.setBrightness(data.brightness);
			callback(null, {});
		});

		this.on('color/set', (data, callback) => {
			console.log(TAG,'color/set',data);
			this.service.setColor(data.color);
			callback(null, {});
		});

		this.on('action', (data, callback) => {
			if (data.value.property === 'turn-on-lights') {
				console.log(TAG,'turn-on-lights',data.value);
				console.log(this.service);
				this.service.setPower(true);
				// this.service.lightOn();
			}
			if (data.property === 'lightOn') {
				console.log(TAG,"lightOn",data);
				this.service.lightOn(data.value);
			}
			if (data.property === 'setPower') {
				console.log(TAG,"setPower",data);
				this.service.setPower(data.value);
			}
			if (data.property === 'setBrightness') {
				console.log(TAG,"setBrightness",data);
				this.service.setBrightness(data.value);
			}
			if (data.property === 'setTheme') {
				this.service.saveTheme(data.value);
			}
			if (data.property === 'theme') {
				this.service.setTheme(data.value);
			}
			if (data.property === 'nextScene') {
				this.service.nextScene();
			}
			if (data.property === 'triggerAlarm') {
				console.log(TAG,"triggerAlarm",data);
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
