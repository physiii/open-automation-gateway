const Service = require('./service.js'),
config = require('../config.json'),
  Gpio = require('onoff').Gpio,
  database = require('./database.js'),
	SirenApi = require('./api/siren-api.js'),
	TAG = '[SirenService]';

class SirenService extends Service {
	constructor (data, relaySocket, save) {
		super(data, relaySocket, save, SirenApi);

    this.siren_gpio = data.gpio;
    this.siren = new Gpio(this.siren_gpio, 'out');
    this.isOn = false;

    this.siren.write(0);
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
    const now = new Date();
    
    this.state.last_siren_date = now;
    this.isOn = true;    
    this.siren.writeSync(1);
    this._logSiren();
    this.relayEmit('on');
    this._events.emit('on');
  }

  sirenOff () {
    this.isOn = false; 
    this.siren.writeSync(0);     
    this.relayEmit('off');
    this._events.emit('off');
  }
  
  _logSiren () {
		database.storeSirenLog({			
			date : this.state.last_siren_date
		});
	} 
  
  getSirenLogs () {
		return new Promise((resolve, reject) => {
			database.getSirenLogs().then((logs) => {
				resolve(logs.map((log) => ({					
					date : log.date.toISOString()
				})));
			}).catch((error) => {
				console.error(TAG, error);
				reject(error);
			});
		});
  }

	dbSerialize () {
		return {
			...Service.prototype.dbSerialize.apply(this, arguments),
      gpio: this.siren_gpio
		};
	}
}

module.exports = SirenService;
