const EventEmitter = require('events'),
  DevicesManager = require('../../devices/devices-manager.js'),
  TAG = '[HueLightDriver]';

class HueLightDriver {
  constructor (light_id, bridge_id) {
    this.light_id = light_id;

    this.bridge = DevicesManager.getServiceById(bridge_id) || false;

    if (!this.bridge) {
      console.error(TAG, 'Could not find bridge service (' + bridge_id + ') for light ' + light_id + '.');
    }

    this.events = new EventEmitter();
  }

  on () {
		return this.events.on.apply(this.events, arguments);
	}

  lightOn () {
    this.bridge.setLightOn(this.light_id);
  }

  lightOff () {
    this.bridge.setLightOff(this.light_id);
  }

  setBrightness (brightness) {
    this.bridge.setBrightness(this.light_id, brightness);
  }

  setColor (color) {
    this.bridge.setColor(this.light_id, color);
  }

  setLightName (name) {
    this.bridge.setLightName(this.light_id, name);
  }

  setAlarm () {
    return;
  }
}

module.exports = HueLightDriver;
