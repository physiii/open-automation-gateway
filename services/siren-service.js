const Service = require('./service.js'),
config = require('../config.json'),
  Gpio = require('onoff').Gpio,
	SirenApi = require('./api/siren-api.js'),
	TAG = '[SirenService]';

class SirenService extends Service {
	constructor (data, relaySocket, save) {
		super(data, relaySocket, save, SirenApi);

    this.siren_gpio = data.Gpio || config.siren_gpio;
    this.siren = new Gpio(this.siren_gpio, 'out');

    this.siren.writeSync(1);
	}

	subscribeToDriver () {
		return;
	}

	onReady (data) {
		return;
	}

  alarmSet (value) {

    if(value) {
      this.sirenOn();
    } else if (!value) {
      this.sirenOff();
    } else {
      console.log(TAG, 'Invalid value for Siren');
    }

  }

  sirenOn () {
    this.siren.writeSync(0);
  }

  sirenOff () {
    this.siren.writeSync(1);
  }

	dbSerialize () {
		return {
			...Service.prototype.dbSerialize.apply(this, arguments),
      gpio: this.siren_gpio
		};
	}
}

module.exports = SirenService;
