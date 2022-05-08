const Service = require('./service.js'),
	WiFiThermostatDriver = require('./drivers/thermostat-wifi.js'),
	ThermostatApi = require('./api/thermostat-api.js'),
	Database = require('./database.js'),
	LOOP_DELAY = 60,
	TAG = '[ThermostatService]';

let TEMP_VALUES = [
		{id: '60', value: 60},
		{id: '61', value: 61},
		{id: '62', value: 62},
		{id: '63', value: 63},
		{id: '64', value: 64},
		{id: '65', value: 65},
		{id: '66', value: 66},
		{id: '67', value: 67},
		{id: '68', value: 68},
		{id: '69', value: 69},
		{id: '70', value: 70},
		{id: '71', value: 71},
		{id: '72', value: 72},
		{id: '73', value: 73},
		{id: '74', value: 74},
		{id: '75', value: 75},
		{id: '76', value: 76},
		{id: '77', value: 77},
		{id: '78', value: 78},
		{id: '79', value: 79},
		{id: '80', value: 80},
		{id: '81', value: 81},
		{id: '82', value: 82},
		{id: '83', value: 83},
		{id: '84', value: 84},
		{id: '85', value: 85},
		{id: '86', value: 86},
		{id: '87', value: 87},
		{id: '88', value: 88},
		{id: '89', value: 89},
		{id: '90', value: 90},
	];

class ThermostatService extends Service {
	constructor (data, relaySocket, save) {
		super(data, relaySocket, save, ThermostatApi);
		this.ip = data.ip;
		this.hold = data.hold;
		this.power = data.power;
		this.schedule = data.schedule ? data.schedule : NEW_SCHEDULE;
		this.saveState();

		this.driver = new WiFiThermostatDriver(this.ip);
		this.subscribeToDriver();
		this.startScheduleLoop();
	}

	subscribeToDriver () {
		this.driver.on('ready', (data) => this.onReady(data));
		this.driver.on('current-temp-changed', (current_temp) => this.state.current_temp = current_temp);
		this.driver.on('target-temp-changed', (target_temp) => this.state.target_temp = target_temp);
		this.driver.on('fan-mode-changed', (fan_mode) => this.state.fan_mode = fan_mode);
		this.driver.on('mode-changed', (mode) => this.state.mode = mode);
		this.on('state-changed', (state) => {
			this.hold.mode == 'off' ? this.checkScheduleState(state.state) : this.checkHoldState(state.state);
			// this.saveState();
		});
	}

	onReady (data) {
		// if (!this.schedule) this.state.schedule = NEW_SCHEDULE;
		this.state.mode = data.mode;
		this.state.current_temp = data.current_temp;
		this.state.target_temp = data.target_temp;
		this.state.fan_mode = data.fan_mode;
		// this.saveState(this.id, this.state);
	}

	checkHoldState(state) {
		let temp = state.current_temp,
			targetTemp = state.target_temp,
			previousTargetTemp = this.previous_target_temp,
			minTemp = this.hold.minTemp,
			maxTemp = this.hold.maxTemp,
			mode = this.hold.mode,
			TAG = "[checkHoldState]";

		if (!this.power) return console.log(TAG, 'Thermostat is currently powered off.');

		if (temp > maxTemp) {
			if (mode != 'cool' || previousTargetTemp != targetTemp) {
				targetTemp = maxTemp -1;
				mode = 'cool';
				this.driver.setTemp(targetTemp, mode);
				console.log(TAG, 'Lowering temperature to', targetTemp);
			}
		}

		if (temp < minTemp) {
			if (mode != 'heat' || previousTargetTemp != targetTemp) {
				targetTemp = minTemp + 1;
				mode = 'heat';
				this.driver.setTemp(targetTemp, mode);
				console.log(TAG, 'Raising temperature to', targetTemp);
			}
		}

		if (temp >= minTemp && temp <= maxTemp && mode != 'off') {
			mode = 'off';
			this.driver.setThermostatMode(mode);
			// console.log(TAG, 'Temperature in window, turning off.', targetTemp);
		}

		if (this.prevMinTemp != minTemp || this.prevMaxTemp != maxTemp) {
			this.driver.setTemp(targetTemp, mode);
			console.log(TAG, 'Temperature bounds changed.', minTemp, maxTemp);
		}

		this.prevMinTemp = minTemp;
		this.prevMaxTemp = maxTemp;
		// this.saveState();
	}

	checkScheduleState(state) {
		const date = new Date(),
			hour = date.getHours() - 1,
			TAG = "[checkScheduleState]";

		let targetTemp = state.target_temp,
			previousTargetTemp = this.previous_target_temp,
			temp = state.current_temp,
			minTemp = this.schedule[hour].minTemp,
			maxTemp = this.schedule[hour].maxTemp,
			power = this.schedule[hour].power,
			mode = this.state.mode;

		if (!power) return console.log(TAG, 'Thermostat is currently powered off.');

		if (temp > maxTemp) {
			if (mode != 'cool' || previousTargetTemp != targetTemp) {
				targetTemp = maxTemp - 1;
				mode = 'cool';
				this.driver.setTemp(targetTemp, mode);
				console.log(TAG, 'Lowering temperature to', targetTemp);
			}
		}

		if (temp < minTemp) {
			if (mode != 'heat' || previousTargetTemp != targetTemp) {
				targetTemp = minTemp + 1;
				mode = 'heat';
				this.driver.setTemp(targetTemp, mode);
				console.log(TAG, 'Raising temperature to', targetTemp);
			}
		}

		if (temp >= minTemp && temp <= maxTemp && mode != 'off') {
			mode = 'off';
			this.driver.setThermostatMode(mode);
			console.log(TAG, 'Temperature in window, turning off.', targetTemp);
		}

		if (this.prevMinTemp != minTemp || this.prevMaxTemp != maxTemp) {
			this.driver.setTemp(targetTemp, mode);
			console.log(TAG, 'Temperature bounds changed.', minTemp, maxTemp);
		}

		this.prevMinTemp = minTemp;
		this.prevMaxTemp = maxTemp;
		// this.saveState();
	}

	// loadState () {
	// 	Database.getThermostatState(this.id)
	// 	.then((state) => {
	// 		Object.assign(this.state, state);
	// 	});
	// }

	saveState () {
		this.save();
		this.state.schedule = this.schedule;
		this.state.power = this.power;
		this.state.hold = this.hold;
	}

	setHoldMode (mode) {
		this.hold.mode = mode;
		this.state.hold.mode = mode;
		this.saveState();
	}

	setPower (mode) {
		console.log('setPower', mode);
		this.driver.setThermostatMode(mode);
		this.power = mode == 'on' ? true : false;
		this.saveState();
	}

	setTemp (temp) {
		this.hold.minTemp = temp.min;
		this.hold.maxTemp = temp.max;
		this.saveState();
	}

	setFanMode (mode) {
		this.driver.setFanMode(mode);
	}

	setSchedule (schedule) {
		this.schedule = schedule;
		this.state.schedule = schedule;
		this.saveState();
	}

	startScheduleLoop () {
		setInterval((self) => {
			const date = new Date();
			this.state.current_hour = date.getHours() - 1;
			// This will cause state to be checked.
			self.saveState();
		}, LOOP_DELAY * 1000, this);
	}

	dbSerialize () {
		return {
			...Service.prototype.dbSerialize.apply(this, arguments),
			ip: this.ip,
			schedule: this.schedule,
			hold: this.hold,
			power: this.power
		};
	}
}

module.exports = ThermostatService;
