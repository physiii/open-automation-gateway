//Placeholder for Thermostat service
const Service = require('./service.js'),
  TAG = '[ThermostatService]';

  class ThermostatService extends Service {
    constructor(data) { // TODO: Add driverClass arguement when ready
      super(data);

      this.id = data.id;
      this.settings.systen_info = data.settings && data.settings.system_info;
      this.settings.program_info = data.settings && data.settings.program_info;
      this.mode = data.mode; // Determines Heating or Cooling
      this.fan_mode = data.fan_mode; // Determines whether the fan is on or off
      this.target_temp = data.target_temp;
      this.current_temp = data.current_temp;

      //this.driver = new driverClass(this.id);
      //this.subscribeToDriver();
    }
  }
