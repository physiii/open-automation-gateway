const Service = require('./service.js'),
	HueLightDriver = require('./drivers/light-hue.js'),
	LightApi = require('./api/light-api.js'),
	Scenes = [
		{ color: "red" },
		{ color: "green" },
		{ color: "blue" },
		{ color: "purple" },
		{ color: "yellow" },
		{ color: "white" }
	],
	AlarmScene = [
		{ color: "red", brightness: 255, power: true, interval: 1000 },
		{ color: "blue", brightness: 255, power: true, interval: 1000 },
	],
	COLORS = {
		red: [255, 0, 0],
		green: [0, 255, 0],
		blue: [0, 0, 255],
		purple: [255, 0, 255],
		yellow: [255, 255, 0],
		white: [255, 255, 255]
	},
	TAG = '[LightService]';

class LightService extends Service {
	constructor (data, relaySocket, save) {
		super(data, relaySocket, save, LightApi);

		this.current_scene = 0;
		this.alarm_state;
		this.light_id = data.light_id;
		this.bridge_id = data.bridge_id;
		this.alarmTimer = setTimeout(() => {}, 0);

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
		console.log(TAG,"onReady",data);
		this.state.power = data.power;
		this.state.brightness = data.brightness;
		this.state.color = data.color;
	}

	lightOn (value) {
		value ? this.driver.lightOn() : this.driver.lightOff();
	}

	setBrightness (brightness) {
		this.driver.setBrightness(brightness);
	}

	setColor (color) {
		this.driver.setColor(color);
	}

	incBrightness(amount) {
		amount = amount / 100; //convert percent to decimal
		let new_brightness = this.state.brightness + amount;
		if (new_brightness > 1) new_brightness = 0;
		if (new_brightness < 0) new_brightness = 0;
		this.driver.lightOn();
		this.driver.setBrightness(new_brightness);
		console.log("decBrightness:",new_brightness,amount);
	}

	nextScene () {
		if (this.current_scene < Scenes.length - 1) {
				this.current_scene++;
		} else {
				this.current_scene = 0;
		}

		let color = Scenes[this.current_scene].color;
		this.driver.setColor(COLORS[color]);
	}

	triggerAlarm (value) {
		if (value) {
			this.startAlarmSequence();
		} else {
			clearTimeout(this.alarmTimer);
		}
	}

	startAlarmSequence () {
		let interval = AlarmScene[this.current_scene].interval;
		if (this.current_scene < AlarmScene.length - 1) {
				this.current_scene++;
		} else {
				this.current_scene = 0;
		}

		if (!interval) AlarmScene[this.current_scene].interval = 0;

		this.alarmTimer = setTimeout(() => {
			console.log(TAG,'Current alarm state.',AlarmScene[this.current_scene]);
			let color = AlarmScene[this.current_scene].color;
			this.setColor(COLORS[color]);
			// this.driver.setBrightness(AlarmScene[this.current_scene].brightness);
			this.lightOn(AlarmScene[this.current_scene].power);
			this.startAlarmSequence();
		}, interval);

	}

	setAlarm (value) {
		if (value === false) {
			console.log(TAG,"Clearing timer.");
			clearTimeout(this.alarmTimer);
		}
		this.alarm_state = value;
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
