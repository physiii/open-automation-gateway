const Service = require('./service.js'),
  config = require('../config.json'),
  Gpio = require('onoff').Gpio,
	ContactSensorApi = require('./api/contact-sensor-api.js'),
	TAG = '[ContactSensorService]';

class ContactSensorService extends Service {
	constructor (data, relaySocket, save) {
		super(data, relaySocket, save, ContactSensorApi);

    this.contact_gpio = data.gpio;
    this.sensor = new Gpio(this.contact_gpio, 'in', 'both');

    this.startSensor();
	}

	subscribeToDriver () {
		return;
	}

	onReady (data) {
		return;
	}

  startSensor () {
    this.sensor.watch((err, value) => {
      if (err) {
        throw err;
      }

      if (value === 0) {
        console.log(TAG, 'Contact Sensor not connected');
        this.state.contact = false;
        this.relayEmit('open');
      } else if (value === 1) {
        console.log(TAG, 'Contact Sensor connected');
        this.state.contact = true;
        this.relayEmit('closed');
      } else {
        console.log(TAG, 'Value from contact sensor GPIO  invalid');
      }

    });
  }

	dbSerialize () {
		return {
			...Service.prototype.dbSerialize.apply(this, arguments),
      gpio: this.contact_gpio
		};
	}
}

module.exports = ContactSensorService;
