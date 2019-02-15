const EventEmitter = require('events'),
	DevicesManager = require('../../devices/devices-manager.js'),
	BRIGHTNESS_SCALE = 255,
	TAG = '[HueLightDriver]';

class HueLightDriver {
	constructor (light_id, bridge_id) {
		this.light_id = light_id;
		this.events = new EventEmitter();
		this.bridge = DevicesManager.getServiceById(bridge_id) || false;

		if (!this.bridge) {
			console.error(TAG, 'Could not find bridge service (' + bridge_id + ') for light ' + light_id + '.');
		}

		this.bridge.getLightState(this.light_id).then((state) => this.events.emit('ready', this.lightStateToState(state)));
		//this.bridge.setBrightness(this.light_id, 100).then(() => this.events.emit('brightness-changed', 100));
	}

	on () {
		return this.events.on.apply(this.events, arguments);
	}

	lightStateToState (light_state) {
		return {
			power: light_state.state.on,
			brightness: light_state.state.bri / BRIGHTNESS_SCALE,
			color: light_state.state.rgb
		};
	}

	lightOn () {
		return this.bridge.lightOn(this.light_id).then(() => this.events.emit('power-changed', true));
	}

	lightOff () {
		return this.bridge.lightOff(this.light_id).then(() => this.events.emit('power-changed', false));
	}

	setBrightness (brightness) {
		return this.bridge.setBrightness(this.light_id, brightness * BRIGHTNESS_SCALE).then(() => this.events.emit('brightness-changed', brightness));
	}

	setColor (color) {
		return this.bridge.setColor(this.light_id, color).then(() => this.events.emit('color-changed', color));
	}

	setLightName (name) {
		return this.bridge.setLightName(this.light_id, name);
	}
}

module.exports = HueLightDriver;
