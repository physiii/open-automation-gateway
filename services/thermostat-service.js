//Placeholder for Thermostat service
const Service = require('./service.js'),
  TAG = '[ThermostatService]';

class ThermostatService extends Service {
  constructor(data, driverClass) { // TODO: Add driverClass arguement when ready
    super(data);

    this.ip = data.ip;
    this.mode = data.mode; // Determines Heating or Cooling
    this.fan_mode = data.fan_mode; // Determines whether the fan is on or off
    this.target_temp = data.target_temp;
    this.current_temp = data.current_temp;
    this.hold_mode = data.hold_mode;

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

  setTemp(temp, mode, hold){
    if (mode == 'heat') {
      if (hold) {
        this.driver.setHoldHeat(temp);
        return;
      }
    this.driver.setHeatTemp (temp);
    } else if (mode == 'cool') {
      if (hold) {
        setHoldCool (temp);
        return;
      }
      setCoolTemp (temp);
    }

    return;
  }

  fanMode (mode) {
    if (mode === "on") {
      this.driver.fanOn();
    } else if (mode === "auto") {
      this.driver.fanAuto();
    }

    return;
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
