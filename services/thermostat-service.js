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
		this.driver.on('ready', (data) => this.onUpdate(data));
		this.driver.on('state update', (data) => this.onUpdate(data));
	}

	onUpdate (data) {
		this.mode = data.mode;
		this.current_temp = data.current_temp;
		this.target_temp = data.target_temp;
		this.fan_mode = data.fan_mode;
		this.hold_mode = data.hold_mode;
	}

	setThermostatMode (mode) {
		this.driver.setThermostatMode(mode);
		this.mode = mode;
	}

	setTemp (temp) {
		this.driver.setTemp(temp);
		this.target_temp = temp;
	}

	setHoldMode (mode) {
		this.driver.setHoldMode (mode);
		this.hold_mode = mode;
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
