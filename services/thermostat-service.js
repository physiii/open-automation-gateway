const Service = require('./service.js'),
	WiFiThermostatDriver = require('./drivers/thermostat-wifi.js'),
	ThermostatApi = require('./api/thermostat-api.js'),
	TAG = '[ThermostatService]';

class ThermostatService extends Service {
	constructor (data, relaySocket) {
		super(data, relaySocket, ThermostatApi);

		this.ip = data.ip;

		this.driver = new WiFiThermostatDriver(this.ip);
		this.subscribeToDriver();
	}

	subscribeToDriver () {
		this.driver.on('ready', (data) => this.onReady(data));
		this.driver.on('mode update', (value) => this.state.mode = value);
		this.driver.on('temp update', (value) => this.state.current_temp = value);
		this.driver.on('target update', (value) => this.state.target_temp = value);
		this.driver.on('fanmode update', (value) => this.state.fan_mode = value);
		this.driver.on('holdmode update', (value) => this.state.hold_mode = value);
	}
	
	onReady (data) {
		this.state.mode = data.mode;
		this.state.current_temp = data.current_temp;
		this.state.target_temp = data.target_temp;
		this.state.fan_mode = data.fan_mode;
		this.state.hold_mode = data.hold_mode;
	}

	setThermostatMode (mode) {
		this.driver.setThermostatMode(mode);
		
	}

	setTemp (temp) {
		this.driver.setTemp(temp);
		
	}

	setHoldMode (mode) {
		this.driver.setHoldMode (mode);
		
	}

	setFanMode (mode) {
		this.driver.setFanMode(mode);
	}

	getSchedule (mode) {
		// mode is either cool or heat modes
		this.driver.getSchedule(mode);
	}

	setSchedule (day, daynumber, schedule, mode) {
		this.driver.setSchedule(day, daynumber, schedule, mode);
	}

	dbSerialize () {
		return {
			...Service.prototype.dbSerialize.apply(this, arguments),
			ip: this.ip
		};
	}
}

module.exports = ThermostatService;
