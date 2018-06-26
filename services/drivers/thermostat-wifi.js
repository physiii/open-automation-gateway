//Placeholder for WiFi driver
const request = require('request'),
  EventEmitter = require('events'),
  poll_delay = 5 * 1000,
  THERMOSTAT_MODES = {
    '0': 'off',
    'off': 0,
    '1': 'heat',
    'heat': 1,
    '2': 'cool',
    'cool': 2,
    '3': 'auto',
    'auto': 3
  },
  FAN_MODES = {
    '1': 'auto',
    'auto': 1,
    '2': 'on',
    'on': 2
  },
  HOLD_MODES = {
    '0': 'off',
    'off': 0,
    '1': 'on',
    'on': 1
  },
  TAG = '[ThermostatWiFiDriver]';



class ThermostatWiFiDriver {
  constructor(ip){
    this.ip = ip;
    this.events = new EventEmitter();
    this.ready = false;

    this.getThermostatState().then((data) => {
      const state = JSON.parse(data);

      this.settings = this.configureData(state);
      this.events.emit('ready', this.settings);
      this.ready = true;
    });

    this.startPolling();
  }

  on () {
		return this.events.on.apply(this.events, arguments);
	}

  startPolling () {
    console.log(TAG, 'Begin Update polling for Thermostat...');

    setInterval((self) => {
      self.getThermostatState().then((data) => {
        const update = JSON.parse(data);

        self.settings = self.configureData(update);
        self.events.emit('state update', self.settings)
        //console.log(TAG,'Settings:', self.settings)
      }).catch((error) => {
        console.log(TAG, 'Polling error:', error);
      })
    }, poll_delay, this);
  }

  getThermostatState () {
    return new Promise ((resolve, reject) => {
      request.get(
        'http://'+this.ip+'/tstat',
        function(error, response, data){
          if (error){
            reject(error);
            return;
          }

        resolve(data)
      });
    });
  };

  setThermostatMode (mode) {
    const self = this;
    let setMode = {
      tmode: THERMOSTAT_MODES[mode]
    };

    if (mode == 'heat') {
      setMode.t_heat = this.settings.target_temp;
    } else if (mode == 'cool') {
      setMode.t_cool= this.settings.target_temp;
    };

    this.postRequest(setMode);
    this.setHoldMode(self.settings.hold_mode);
  }

  setTemp (temperature) {
    let setMode = {
        tmode: THERMOSTAT_MODES[this.settings.mode],
        hold: HOLD_MODES[this.settings.hold_mode]
      };

    if (this.settings.mode == 'heat') {
      setMode.t_heat = temperature;
    } else if (this.settings.mode == 'cool') {
      setMode.t_cool = temperature;
    }

    this.postRequest(setMode);
  }

  setHoldMode (mode) {
    let setMode = {hold: HOLD_MODES[mode] };
    this.postRequest(setMode);
  }

  setFanMode (mode) {
    let setMode = {fmode: FAN_MODES[mode] };
    this.postRequest(setMode);
  }

  getSchedule (mode) {
    return new Promise ((resolve, reject) => {
      request.get(
        'http://'+this.ip+'/tstat/program/'+mode,
        function(error, response, data){
          if (error){
            reject(error);
            return;
          }

        resolve(data)
      });
    });
  }

  setSchedule (day, daynumber, schedule, mode) {
    let daySet = { dayNumber: schedule };

    return new Promise((resolve, reject) => {
      let dayNumber = data.dayNumber,
        schedule = data.schedule;

      request.post({
        headers: {'content-type' : 'application/x-www-form-urlencoded'},
        url:     'http://'+this.ip+'/tstat/program/'+mode+'/'+ day,
        body:    JSON.stringify(daySet)
      }, function (error, response, body) {
        if (error) {
          reject(error);
          return;
        }

        resolve(response, body);
      });
    });
  }

  configureData (data) {
    return {
      mode: THERMOSTAT_MODES[data.tmode],
      fan_mode: FAN_MODES[data.fmode],
      hold_mode: HOLD_MODES[data.hold],
      current_temp: data.temp,
      target_temp: data.t_cool || data.t_heat,
    };
  }

  postRequest(data) {
    return new Promise((resolve, reject) => {
      request.post({
        headers: {'content-type' : 'application/x-www-form-urlencoded'},
        url:     'http://'+this.ip+'/tstat',
        body:    JSON.stringify(data)
      }, function (error, response, body) {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

module.exports = ThermostatWiFiDriver;
