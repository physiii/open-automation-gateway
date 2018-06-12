//TODO Light class service
const Service = require('./service.js'),
	TAG = '[LightService]';

  class LightService extends Service {
    constructor (data, driverClass) {
      super(data);

      this.light_id = data.light_id;
      
      this.bridge = new BridgeClass();
      this.driver = new DriverClass(this.light_id, this.bridge)
    }
  }
