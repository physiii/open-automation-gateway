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
      console.log(TAG,'Settings:', this.settings);
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
        console.log(TAG,'Settings:', self.settings)
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
    this.ThermostatMode(mode).then(() => {
      this.setHoldMode(this.settings.hold_mode);
    }).then(() => {
      this.setTemp(this.settings.target_temp);
    });
  }

  ThermostatMode (mode) {
    return new Promise((resolve, reject) => {
      request.post({
        headers: {'content-type' : 'application/x-www-form-urlencoded'},
        url:     'http://'+this.ip+'/tstat',
        body:    JSON.stringify({ tmode: THERMOSTAT_MODES[mode] })
      }, function (error, response, body) {
        if (error) {
          reject(error);
          return;
        }
        console.log(TAG, 'setThermostatMode',response, body )
        resolve(response, body);
      });
    });
  }

  setTemp (mode, temperature) {
    if (mode == 'heat') {
      let setMode = {
        tmode: THERMOSTAT_MODES[mode],
        t_heat: temperature
      };
    };
    if (mode == 'cool') {
      let setMode = {
        tmode: THERMOSTAT_MODES[mode],
        t_cool: temperature
      };
    };

    return new Promise((resolve, reject) => {
      request.post({
        headers: {'content-type' : 'application/x-www-form-urlencoded'},
        url:     'http://'+this.ip+'/tstat',
        body:    JSON.stringify(setMode)
      }, function (error, response, body) {
        if (error) {
          reject(error);
          return;
        }
        console.log(TAG, 'setTemp', body )
        resolve(response, body);
        return;
      });
    });
  }

  setHoldMode (mode) {
    return new Promise((resolve, reject) => {
      request.post({
        headers: {'content-type' : 'application/x-www-form-urlencoded'},
        url:     'http://'+this.ip+'/tstat',
        body:    JSON.stringify({hold: HOLD_MODES[mode] })
      }, function (error, response, body) {
        if (error) {
          reject(error);
          return;
        }
        this.settings.hold_mode = mode;
        resolve(response, body);
      });
    });
  }

  setFanMode (mode) {
    return new Promise((resolve, reject) => {
      request.post({
        headers: {'content-type' : 'application/x-www-form-urlencoded'},
        url:     'http://'+this.ip+'/tstat',
        body:    JSON.stringify({fmode: FAN_MODES[mode] })
      }, function (error, response, body) {
        if (error) {
          reject(error);
          return;
        }
        this.settings.fan_mode = mode;
        resolve(response, body);
      });
    });
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

  setSchedule (data) {
    return new Promise((resolve, reject) => {
      let dayNumber = data.dayNumber,
        schedule = data.schedule;

      request.post({
        headers: {'content-type' : 'application/x-www-form-urlencoded'},
        url:     'http://'+this.ip+'/tstat/program/'+data.mode+'/'+data.day,
        body:    JSON.stringify({dayNumber: schedule})
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
}

module.exports = ThermostatWiFiDriver;
