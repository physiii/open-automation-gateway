//Placeholder for WiFi driver
const request = require('request'),
  EventEmitter = require('events'),
  poll_delay = 30 * 1000,
  TAG = '[ThermostatWiFiDriver]';

class ThermostatWiFiDriver {
  constructor(ip){
    this.ip = ip;
    this.events = new EventEmitter();
    this.ready = false;

    this.getThermostatState().then((data) => {
      const state = JSON.parse(data);

      this.settings = {
        mode: state.tmode,
        current_temp: state.temp,
        target_temp: state.t_cool || state.t_heat,
        fan_mode: state.fmode,
        hold_mode: state.hold
      };
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
        self.settings = {
          mode: update.tmode,
          current_temp: update.temp,
          target_temp: update.t_cool || update.t_heat,
          fan_mode: update.fmode,
          hold_mode: update.hold
        };
        self.events.emit('state update', self.settings)
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

  setCoolTemp (temperature) {
    return new Promise((resolve, reject) => {
      request.post({
        headers: {'content-type' : 'application/x-www-form-urlencoded'},
        url:     'http://'+this.ip+'/tstat',
        body:    JSON.stringify({tmode: 2, t_cool: temperature, hold: 0 })
      }, function (error, response, body) {
        if (error) {
          reject(error);
          return;
        }
        console.log('setCoolTemp',response, body )
        resolve(response, body);
      });
    });
  }

  setHeatTemp (temperature) {
    return new Promise((resolve, reject) => {
      request.post({
        headers: {'content-type' : 'application/x-www-form-urlencoded'},
        url:     'http://'+this.ip+'/tstat',
        body:    JSON.stringify({tmode: 1, t_heat: temperature, hold: 0 })
      }, function (error, response, body) {
        if (error) {
          reject(error);
          return;
        }

        resolve(response, body);
      });
    });
  }

  setHoldCool (temperature) {
    return new Promise((resolve, reject) => {
      request.post({
        headers: {'content-type' : 'application/x-www-form-urlencoded'},
        url:     'http://'+this.ip+'/tstat',
        body:    JSON.stringify({tmode: 2, t_cool: temperature, hold: 1 })
      }, function (error, response, body) {
        if (error) {
          reject(error);
          return;
        }

        resolve(response, body);
      });
    });
  }

  setHoldHeat (temperature) {
    return new Promise((resolve, reject) => {
      request.post({
        headers: {'content-type' : 'application/x-www-form-urlencoded'},
        url:     'http://'+this.ip+'/tstat',
        body:    JSON.stringify({tmode: 1, t_heat: temperature, hold: 1 })
      }, function (error, response, body) {
        if (error) {
          reject(error);
          return;
        }

        resolve(response, body);
      });
    });
  }

  removeHold () {
    return new Promise((resolve, reject) => {
      request.post({
        headers: {'content-type' : 'application/x-www-form-urlencoded'},
        url:     'http://'+this.ip+'/tstat',
        body:    JSON.stringify({hold: 0 })
      }, function (error, response, body) {
        if (error) {
          reject(error);
          return;
        }

        resolve(response, body);
      });
    });
  }

  fanOn () {
    return new Promise((resolve, reject) => {
      request.post({
        headers: {'content-type' : 'application/x-www-form-urlencoded'},
        url:     'http://'+this.ip+'/tstat',
        body:    JSON.stringify({fmode: 2 })
      }, function (error, response, body) {
        if (error) {
          reject(error);
          return;
        }

        resolve(response, body);
      });
    });
  }

  fanAuto () {
    return new Promise((resolve, reject) => {
      request.post({
        headers: {'content-type' : 'application/x-www-form-urlencoded'},
        url:     'http://'+this.ip+'/tstat',
        body:    JSON.stringify({fmode: 1 })
      }, function (error, response, body) {
        if (error) {
          reject(error);
          return;
        }

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



}
module.exports = ThermostatWiFiDriver;
