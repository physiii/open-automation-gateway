//Placeholder for WiFi driver
const request = require('request'),
	EventEmitter = require('events'),
	poll_delay = 5 * 1000,
	THERMOSTAT_MODES = {
		'0': 'off',
		'1': 'heat',
		'2': 'cool',
		'3': 'auto',
		'off': 0,
		'heat': 1,
		'cool': 2,
		'auto': 3
	},
	FAN_MODES = {
		'1': 'auto',
		'2': 'on',
		'auto': 1,
		'on': 2
	},
	HOLD_MODES = {
		'0': 'off',
		'1': 'on',
		'off': 0,
		'on': 1
	},
	TAG = '[WiFiThermostatDriver]';

class WiFiThermostatDriver {
	constructor (ip) {
		this.ip = ip;
		this.events = new EventEmitter();
		this.ready = false;

		this.getThermostatState().then((data) => {
			const state = JSON.parse(data);

			this.state = this.initializeData(state);
			this.events.emit('ready', this.state);
			this.ready = true;
		});

		this.startPolling();
	}

	on () {
		return this.events.on.apply(this.events, arguments);
	}

	startPolling () {
		console.log(TAG, 'Begin Update polling for Thermostat...');

		setInterval((self) => {
			self.getThermostatState().then((data) => {
				self.state = self.configureData(JSON.parse(data));				
			}).catch((error) => {
				console.log(TAG, 'Polling error:', error);
			})
		}, poll_delay, this);
	}

	getThermostatState () {
		return new Promise((resolve, reject) => {
			request.get('http://' + this.ip + '/tstat', (error, response, data) => {
				if (error) {
					reject(error);
					return;
				}

				resolve(data);
			});
		});
	};

	setThermostatMode (mode) {
		let setMode = {
			tmode: THERMOSTAT_MODES[mode]
		};

		if (mode === 'heat') {
			setMode.t_heat = this.settings.target_temp;
		} else if (mode === 'cool') {
			setMode.t_cool= this.settings.target_temp;
		}

		this.postRequest(setMode);
		this.setHoldMode(this.settings.hold_mode);
	}

	setTemp (temperature) {
		let setMode = {
				tmode: THERMOSTAT_MODES[this.settings.mode],
				hold: HOLD_MODES[this.settings.hold_mode]
			};

		if (this.settings.mode == 'heat') {
			setMode.t_heat = temperature;
		} else if (this.settings.mode == 'cool') {
			setMode.t_cool = temperature;
		}

		this.postRequest(setMode);
	}

	setHoldMode (mode) {
		this.postRequest({hold: HOLD_MODES[mode]});
	}

	setFanMode (mode) {
		this.postRequest({fmode: FAN_MODES[mode]});
	}

	getSchedule (mode) {
		return new Promise((resolve, reject) => {
			request.get('http://' + this.ip + '/tstat/program/'+mode, (error, response, data) => {
				if (error) {
					reject(error);
					return;
				}

				resolve(data);
			});
		});
	}

	setSchedule (day, daynumber, schedule, mode) {
		let daySet = {dayNumber: schedule};

		return new Promise((resolve, reject) => {
			let dayNumber = data.dayNumber,
				schedule = data.schedule;

			request.post({
				headers: {'content-type' : 'application/x-www-form-urlencoded'},
				url:     'http://' + this.ip + '/tstat/program/' + mode + '/' + day,
				body:    JSON.stringify(daySet)
			}, (error, response, body) => {
				if (error) {
					reject(error);
					return;
				}

				resolve(response, body);
			});
		});
	}

	configureData (data) {
		let results = {
			mode: THERMOSTAT_MODES[data.tmode],
			fan_mode: FAN_MODES[data.fmode],
			hold_mode: HOLD_MODES[data.hold],
			current_temp: data.temp,
			target_temp: data.t_cool || data.t_heat
		};
		
		if (this.state.mode != results.mode) this.events.emit('mode update', results.mode);
		if (this.state.current_temp != results.current_temp) this.events.emit('temp update', results.current_temp);
		if (this.state.target_temp != results.target_temp) this.events.emit('target update', results.target_temp);
		if (this.state.fan_mode != results.fan_mode) this.events.emit('fanmode update', results.fan_mode);
		if (this.state.hold_mode != results.hold_mode) this.events.emit('holdmode update', results.hold_mode);		
				
		return results;
	}
	
	initializeData (data) {
		return {
			mode: THERMOSTAT_MODES[data.tmode],
			fan_mode: FAN_MODES[data.fmode],
			hold_mode: HOLD_MODES[data.hold],
			current_temp: data.temp,
			target_temp: data.t_cool || data.t_heat
		}
	}

	postRequest (data) {
		return new Promise((resolve, reject) => {
			request.post({
				headers: {'content-type' : 'application/x-www-form-urlencoded'},
				url:     'http://' + this.ip + '/tstat',
				body:    JSON.stringify(data)
			}, (error, response, body) => {
				if (error) {
					reject(error);
					return;
				}

				resolve();
			});
		});
	}
}

module.exports = WiFiThermostatDriver;
