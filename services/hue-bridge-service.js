const Service = require('./service.js'),
	hue = require ('node-hue-api'),
	v3 = require('node-hue-api').v3,
	LightState = v3.lightStates.LightState,
  discovery = v3.discovery,
	lightState = hue.lightState,
	msToSec = 1000,
	ONE_SECOND_IN_MILLISECONDS = 1000,
	TAG = '[hue-bridge-service.js]';

class HueBridgeService extends Service {
	constructor (data, relay_socket, save) {
		super(data, relay_socket, save);

		this.ip = data.ip;
		this.user = data.user;
		v3.api.createLocal(this.ip).connect(this.user)
			.then(api => this.hueApi = api);

	}

	getAllLights () {
		return new Promise((resolve, reject) => {
			this.hueApi.lights.getAll()
				.then(allLights => {
					resolve(allLights)
				});
		});
	}

	findAttachedLights () {
		this.hueApi.lights(function(error, lights) {
			if (error) throw error;
			console.log(JSON.stringify(lights));
		});
	}

	addNewLights () {
		this.hueApi.searchForNewLights().then(() => {
			this.hueApi.newLights()
		}).done();
	}

	getLightState (device_id) {
		return new Promise((resolve, reject) => {
			console.log(TAG, 'Finding state information for ' + device_id);

			this.hueApi.lightStatusWithRGB(device_id, (error, result) => {
				if (error) {
					throw error;
				}

				console.log(JSON.stringify(result));

				resolve(result);
			});
		});
	}

	setPower (lightId, value) {
		this.hueApi.lights.setLightState(lightId, {on: value});
	}

 later(delay, value) {
    return new Promise(resolve => setTimeout(resolve, delay, value));
	}

	async identifyLight (lightId) {
		this.later(ONE_SECOND_IN_MILLISECONDS).then(() => { this.setPower(lightId, false) });
		this.later(2 * ONE_SECOND_IN_MILLISECONDS).then(() => { this.setPower(lightId, true) });
		this.later(3 * ONE_SECOND_IN_MILLISECONDS).then(() => { this.setPower(lightId, false) });
		this.later(4 * ONE_SECOND_IN_MILLISECONDS).then(() => { this.setPower(lightId, true) });
	}

	setBrightness (lightId, value) {
		if (value < 1) value = 1;
		if (value > 254) value = 254;
		const state = new LightState().on().bri(value);
		this.hueApi.lights.setLightState(lightId, state);
	}

	setColor (lightId, color) {
		const state = new LightState().on().rgb(color);
		this.hueApi.lights.setLightState(lightId, state);
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
