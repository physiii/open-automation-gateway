const Service = require('./service.js'),
	HueLightDriver = require('./drivers/light-hue.js'),
	LightApi = require('./api/light-api.js'),
	TAG = '[LightService]';

class LightService extends Service {
	constructor (data, relaySocket) {
		super(data, relaySocket, LightApi);

		this.light_id = data.light_id;
		this.bridge_id = data.bridge_id;

		this.driver = new HueLightDriver(this.light_id, this.bridge_id);
	}

	lightOn () {
		this.driver.lightOn();
	}

	lightOff () {
		this.driver.lightOff();
	}

	setBrightness (brightness) {
		this.driver.setBrightness(brightness);
	}

	setColor (color) {
		this.driver.setColor(color);
	}

	setLightName (name) {
		this.driver.setLightName(name);
	}

	dbSerialize () {
		return {
			...Service.prototype.dbSerialize.apply(this, arguments),
			light_id: this.light_id,
			bridge_id: this.bridge_id
		};
	}
}

module.exports = LightService;
