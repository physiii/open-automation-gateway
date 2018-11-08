const Service = require('./service.js'),
  config = require('../config.json'),
  Gpio = require('onoff').Gpio,
	ContactSensorApi = require('./api/contact-sensor-api.js'),
	TAG = '[ContactSensorService]';

class ContactSensorService extends Service {
	constructor (data, relaySocket, save) {
		super(data, relaySocket, save, ContactSensorApi);

    this.contact_gpio = data.gpio || config.contact_gpio
    this.sensor = new Gpio(this.contact_gpio, 'in', 'rising', {debounceTimeout: 10});

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
      } else if (value === 1) {
        console.log(TAG, 'Contact Sensor connected');
        this.state.contact = true;
      } else {
        console.log(TAG, 'Value from contact sensor GPIO  invalid');
      }

    });

    process.on('SIGINT', () => {
      this.sensor.unexport();
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
