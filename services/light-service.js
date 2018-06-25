const Service = require('./service.js'),
  ServiceManager = require('./services-manager.js'),
	TAG = '[LightService]';

class LightService extends Service {
  constructor (data, driverClass) {
    super(data);

    this.light_id = data.light_id;
    this.bridge = ServiceManager.getServiceById(data.bridge_id) || false;

    this.driver = new DriverClass(this.light_id, this.bridge);
    this.subscribeToDriver();
  }

  subscribeToDriver() {
    return;
  }

  lightOn () {
    this.driver.setLightOn();
  };

  lightOff () {
    this.driver.setLightOff();
  };

  setBrightness (brightness) {
    this.driver.setBrightness(brightness);
  };

  setColor (color) {
    this.driver.setColor(color);
  };

  setLightName (name) {
    this.driver.setLightName(name);
  }
}

module.exports = LightService;
