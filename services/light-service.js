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
		this.state.power = true;
	}

	lightOff () {
		this.driver.lightOff();
		this.state.power = false;
	}

	setBrightness (brightness) {
		this.driver.setBrightness(brightness);
		
		if (this.state.brightness === brightness) return;
		
		this.state.brightness = brightness;
	}

	setColor (color) {
		this.driver.setColor(color);
		this.state.color = color
	}

	setLightName (name) {
		this.driver.setLightName(name);
		this.state.name = name;
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
