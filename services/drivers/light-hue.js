const hueBridge = require('../hue-bridge-service.js'),
  TAG = '[HueLightDriver]';

  class HueLightDriver {
    constructor (light_id) {
      this.light_id = light_id;
      this.bridge = new hueBridge();
    };

    lightOn () {
      this.bridge.setLightOn(this.light_id);
    };

    lightOff () {
      this.bridge.setLightOff(this.light_id);
    };

    setBrightness (brightness) {
      this.bridge.setBrightness(this.light_id, brightness);
    };

    incrementBrightness () {return;};

    setColor (color) {
      this.bridge.setColor(this.light_id, color);
    };

    setAlarm () {return;};

  }

  module.exports = HueLightDriver;
