const Service = require('./service.js'),
	HueLightDriver = require('./drivers/light-hue.js'),
	DevicesManager = require('../devices/devices-manager.js'),
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
	Themes = [
		{r: 255, g: 255, b: 255},
		{r: 255, g: 0, b: 255},
		{r: 0, g: 0, b: 255},
		{r: 0, g: 255, b: 0},
	]
	brightConversion = 255;
	TAG = '[LightService]';

class LightService extends Service {
	constructor (data, relaySocket, save) {
		super(data, relaySocket, save, LightApi);

		this.current_scene = 0;
		this.themes = data.themes || [];
		this.state.themes = this.themes.map((theme) => theme.color);
		this.alarm_state;
		this.lightIds = data.lightIds;
		this.alarmTimer = setTimeout(() => {}, 0);
		this.bridgeService = DevicesManager.getServicesByType('hue_bridge')[0];
	}
	setPower (value) {
		this.lightIds.forEach(id => {
			this.bridgeService.setPower(id, value);
		});

		this.state.power = value;
	}

	setBrightness (value) {
		if (value < 1) value = 1;
		if (value > 254) value = 254;
		this.lightIds.forEach(id => {
			let bri = value * brightConversion / 100
			this.bridgeService.setBrightness(id, bri);
		});

		this.state.brightness = value;
	}

	setTheme (newTheme) {
		const themeIndex = this.themes.findIndex((theme) => {
				return theme.theme == newTheme ? true : false;
			}),
			color = [
				this.themes[themeIndex].color.r,
				this.themes[themeIndex].color.g,
				this.themes[themeIndex].color.b
			];

		console.log(TAG,'setTheme', color);
		this.setColor(color);
	}

	saveTheme (theme) {
		let color = [theme.color.r, theme.color.g, theme.color.b]
		this.lightIds.forEach(id => {
			this.bridgeService.setColor(id, color);
		});
		this.setColor(color);
		this.themes[theme.theme] = theme;
		this.state.themes = this.themes.map((theme) => theme.color);
		this.save();
		console.log(TAG,'saveTheme', color);
	}

	setColor (color) {
		this.lightIds.forEach(id => {
			this.bridgeService.setColor(id, color);
		});
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
			lightIds: this.lightIds,
			themes: this.themes
		};
	}
}

module.exports = LightService;
