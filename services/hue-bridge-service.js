const Service = require('./service.js'),
	hue = require ('node-hue-api'),
	HueApi = hue.HueApi,
	lightState = hue.lightState,
	TAG = '[hue-bridge-service.js]';

class HueBridgeService extends Service {
	constructor (data, relay_socket, save) {
		super(data, relay_socket, save);

		console.log(TAG,"data:",data);
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

				console.log(JSON.stringify(result));

				resolve(result);
			});
		});
	}

	lightOn (device_id) {
		return new Promise((resolve, reject) => {
			this.hue_api.setLightState(device_id, this.light_state.on(), function(error, result) {
				if (error) {
					throw error;
				}

				resolve();
			});
		});
	}

	lightOff (device_id) {
		return new Promise((resolve, reject) => {
			this.hue_api.setLightState(device_id, this.light_state.off(), function(error, result) {
				if (error) {
					throw error;
				}

				resolve();
			});
		});
	}

	setColor (device_id, color) {
		return new Promise((resolve, reject) => {
			this.hue_api.setLightState(device_id, this.light_state.rgb(color), function(error, result) {
				if (error) {
					throw error;
				}
				resolve();
			});
		});
	}

	setBrightness (device_id, brightness) {
		return new Promise((resolve, reject) => {
			this.hue_api.setLightState(device_id, this.light_state.brightness(brightness), function(error, result) {
				if (error) {
					throw error;
				}

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
