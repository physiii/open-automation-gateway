const Service = require('./service.js'),
	hue = require ('node-hue-api'),
	HueApi = hue.HueApi,
	lightState = hue.lightState,
	TAG = '[hue-bridge-service.js]';

class HueBridgeService extends Service {
	constructor (data, relay_socket, save) {
		super(data, relay_socket, save);

		this.ip = data.ip;
		this.user = data.user;

		this.hue_api = new HueApi(this.ip, this.user);
		this.light_state = lightState.create();
	}

	findAttachedLights () {
		this.hue_api.lights(function(error, lights) {
			if (error) {
				throw error;
			}

			console.log(JSON.stringify(lights));
		});
	}

	addNewLights () {
		this.hue_api.searchForNewLights().then(() => {
			this.hue_api.newLights()
		}).done();
	}

	setLightName (device_id, name) {
		return new Promise((resolve, reject) => {
			this.hue_api.setLightName(device_id, name, (error, result) => {
				if (error) {
					throw error;
				}

				console.log(TAG, 'Setting light' + device_id + '\'s name to ' + name);

				resolve();
			});
		});
	}

	getLightState (device_id) {
		return new Promise((resolve, reject) => {
			console.log(TAG, 'Finding state informaiton for ' + device_id);

			this.hue_api.lightStatusWithRGB(device_id, (error, result) => {
				if (error) {
					throw error;
				}

				//console.log(JSON.stringify(result));

				resolve(result);
			});
		});
	}

	lightOn (device_id) {
		return new Promise((resolve, reject) => {
			console.log(TAG, 'Set light: on');

			this.hue_api.setLightState(device_id, this.light_state.on(), function(error, result) {
				if (error) {
					throw error;
				}

				console.log(TAG, result);

				resolve();
			});
		});
	}

	lightOff (device_id) {
		return new Promise((resolve, reject) => {
			console.log(TAG, 'Set light: off');

			this.hue_api.setLightState(device_id, this.light_state.off(), function(error, result) {
				if (error) {
					throw error;
				}

				console.log(TAG, result);

				resolve();
			});
		});
	}

	setColor (device_id, color) {
		return new Promise((resolve, reject) => {
			console.log(TAG, 'Set color');

			this.hue_api.setLightState(device_id, this.light_state.rgb(color), function(error, result) {
				if (error) {
					throw error;
				}

				console.log(TAG, result);

				resolve();
			});
		});
	}

	setBrightness (device_id, brightness) {
		return new Promise((resolve, reject) => {
			console.log(TAG, 'Set brightness to ' + brightness);

			this.hue_api.setLightState(device_id, this.light_state.brightness(brightness), function(error, result) {
				if (error) {
					throw error;
				}

				console.log(TAG, result);

				resolve();
			});
		});
	}

	dbSerialize () {
		return {
			...Service.prototype.dbSerialize.apply(this, arguments),
			ip: this.ip,
			user: this.user
		};
	}

}

module.exports = HueBridgeService;
