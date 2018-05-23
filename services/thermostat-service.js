//Placeholder for Thermostat service
const Service = require('./service.js'),
  TAG = '[ThermostatService]';

class ThermostatService extends Service {
  constructor(data) { // TODO: Add driverClass arguement when ready
    super(data);

    this.id = data.id;
    this.ip = data.ip
    this.mode = data.mode; // Determines Heating or Cooling
    this.fan_mode = data.fan_mode; // Determines whether the fan is on or off
    this.target_temp = data.target_temp;
    this.current_temp = data.current_temp;

    this.driver = new driverClass(this.ip);
    this.subscribeToDriver();
  }

  subscribeToDriver() {
    return;
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

  fanMode () {
    if (this.fan_mode === "1") {
      this.driver.fanOn();
    } else if (this.fan_mode === "2") {
      this.driver.fanAuto();
    }

    return;
  }

  getCurrentProgram () {
    return;
  }


}
module.exports = ThermostatService;
