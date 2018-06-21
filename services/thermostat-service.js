//Placeholder for Thermostat service
const Service = require('./service.js'),
  TAG = '[ThermostatService]';

class ThermostatService extends Service {
  constructor(data, driverClass) { // TODO: Add driverClass arguement when ready
    super(data);

    this.ip = data.ip;

    this.driver = new driverClass(this.ip);
    this.subscribeToDriver();
  }

  subscribeToDriver() {
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

  setTemp(temp){
    if (this.mode == 'heat') {
      this.target_temp = temp;
      this.driver.setHeatTemp (temp);
      return;
    }
    if (this.mode == 'cool') {
      this.target_temp = temp;
      this.driver.setCoolTemp (temp);
      return;
    }
    console.log (TAG, 'Thermostat is off. Cannot set Temp');
  }

  setHoldMode (mode) {
    this.hold_mode = mode;
    this.driver.setHoldMode (mode);
  }

  setFanMode (mode) {
    if (mode === "on") {
      this.fan_mode = mode;
      this.driver.fanOn();
      return;
    }
    if (mode === "auto") {
      this.fan_mode = mode;
      this.driver.fanAuto();
      return;
    }
    console.log(TAG, 'Invalid fan mode. Please choose on or auto');
  }

  getSchedule (mode) {
    // mode is either cool or heat modes
    this.driver.getSchedule(mode);
  }

  setSchedule(day, daynumber, schedule, mode){
    let data = {
      day: day,
      daynumber: daynumber,
      schedule: schedule,
      mode: mode
    };

    this.driver.setSchedule(data);
  }

  dbSerialize () {
    return {
      ...Service.prototype.dbSerialize.apply(this, arguments),
      ip: this.ip
    };
  }

}
module.exports = ThermostatService;
