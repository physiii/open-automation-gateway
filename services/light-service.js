const Service = require('./service.js'),
	HueLightDriver = require('./drivers/light-hue.js'),
	LightApi = require('./api/light-api.js'),
	TAG = '[LightService]';

class LightService extends Service {
	constructor (data, relaySocket, save) {
		super(data, relaySocket, save, LightApi);

		this.light_id = data.light_id;
		this.bridge_id = data.bridge_id;

		this.driver = new HueLightDriver(this.light_id, this.bridge_id);
		this.subscribeToDriver();
	}

	subscribeToDriver () {
		this.driver.on('ready', (data) => this.onReady(data));
		this.driver.on('power-changed', (power) => this.state.power = power);
		this.driver.on('brightness-changed', (brightness) => this.state.brightness = brightness);
		this.driver.on('color-changed', (color) => this.state.color = color);
	}

	onReady (data) {
		this.state.power = data.power;
		this.state.brightness = data.brightness;
		this.state.color = data.color;
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
