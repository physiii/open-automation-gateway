const Service = require('./service.js'),
  config = require('../config.json'),
  database = require('./database.js'),
  Gpio = require('onoff').Gpio,
	ContactSensorApi = require('./api/contact-sensor-api.js'),
	TAG = '[ContactSensorService]';

class ContactSensorService extends Service {
	constructor (data, relaySocket, save) {
		super(data, relaySocket, save, ContactSensorApi);

    this.contact_gpio = data.gpio;    
    this.sensor = new Gpio(this.contact_gpio, 'in', 'both');

    this._handleContactChange();
	}

	subscribeToDriver () {
		return;
	}

	onReady (data) {
		return;
	}
  
  _handleContactChange () {
    this.sensor.watch((err, value) => {
      if (err) {
        throw err;
      }
      
      const is_open = value === 0,
        now = new Date(),        
        state_string = is_open ? 'open' : 'closed';
        
      this.state.last_contact_date = now,
      console.log(TAG, 'Received contact ' + state_string);

      this.state.contact = state_string;
      this.relayEmit(state_string);
      this._events.emit(state_string);
      this._logAccess(is_open);
    });
  }
  
  _logAccess (is_open) {
		database.storeAccessLog({
			description : is_open ? 'Opened' : 'Closed',
			contact: this.state.contact,
			date : new Date()
		});
	} 
  

	getAccessLogs () {
		return new Promise((resolve, reject) => {
			database.getAccessLogs().then((logs) => {
				resolve(logs.map((log) => ({
					description : log.description,
					contact: log.contact,
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
      gpio: this.contact_gpio
		};
	}
}

module.exports = ContactSensorService;
