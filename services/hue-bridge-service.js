const Service = require('./service.js'),
	hue = require ('node-hue-api'),
	v3 = require('node-hue-api').v3,
	LightState = v3.lightStates.LightState,
  discovery = v3.discovery,
  hueApi = v3.api,
	lightState = hue.lightState,
	TAG = '[hue-bridge-service.js]';

class HueBridgeService extends Service {
	constructor (data, relay_socket, save) {
		super(data, relay_socket, save);

		this.ip = data.ip;
		this.user = data.user;

		// this.hue_api = new HueApi(this.ip, this.user);
		this.hue_api = v3.api.createLocal(this.ip).connect(this.user);

	}

	getAllLights () {
		return new Promise((resolve, reject) => {
			v3.discovery.nupnpSearch()
			  .then(searchResults => {
			    const host = searchResults[0].ipaddress;
			    return v3.api.createLocal(host).connect(this.user);
			  })
			  .then(api => {
			    return api.lights.getAll();
			  })
			  .then(allLights => {
					resolve(allLights);
			  })
			;
		});
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

	setPower (lightId, value) {
		return new Promise((resolve, reject) => {
			v3.discovery.nupnpSearch()
			  .then(searchResults => {
			    const host = searchResults[0].ipaddress;
			    return v3.api.createLocal(host).connect(this.user);
			  })
			  .then(api => {
			    // Using a basic object to set the state
			    return api.lights.setLightState(lightId, {on: value});
			  })
			  .then(result => {
			    console.log(`Light state change was successful? ${result}`);
			  })
			;
		});
	}

	setBrightness (lightId, value) {
		return new Promise((resolve, reject) => {
			v3.discovery.nupnpSearch()
			  .then(searchResults => {
			    const host = searchResults[0].ipaddress;
			    return v3.api.createLocal(host).connect(this.user);
			  })
			  .then(api => {
			    // Using a LightState object to build the desired state
			    const state = new LightState().on().bri(value);
			    return api.lights.setLightState(lightId, state);
			  })
			  .then(result => {
			    console.log(`Light state change was successful? ${result}`);
			  })
			;
		});
	}

	setColor (id, color) {
		return new Promise((resolve, reject) => {
			v3.discovery.nupnpSearch()
			  .then(searchResults => {
			    const host = searchResults[0].ipaddress;
			    return v3.api.createLocal(host).connect(this.user);
			  })
			  .then(api => {
			    // Using a LightState object to build the desired state
			    const state = new LightState().on().rgb(color);
			    return api.lights.setLightState(id, state);
			  })
			  .then(result => {
			    console.log(`Light state change was successful? ${result}`);
			  })
			;
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
