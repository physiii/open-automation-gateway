const hueBridge = require('../hue-bridge-service.js'),
  EventEmitter = require('events'),
  TAG = '[HueLightDriver]';

  class HueLightDriver {
    constructor (id, bridge) {
      this.id = id;
      this.bridge = bridge;


      this.events = new EventEmitter();

    };

    on () {
  		return this.events.on.apply(this.events, arguments);
  	}

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
