//Placeholder for WiFi driver
const request = require('request'),
  EventEmitter = require('events'),
  poll_delay = 30,
  TAG = '[ThermostatWiFiDriver]';

class ThermostatWiFiDriver {
  constructor(ip){
    this.ip = ip;
    this.events = new EventEmitter();
    this.ready = false;

    this.getThermostatState().then((data) => {
      this.events.emit('ready', {
        mode: data.tmode,
        current_temp: data.temp,
        target_temp: data.t_cool || data.t_heat,
        fan_mode: data.fmode,
        hold_mode: data.hold
      });
      this.ready = true;
    }).then(function() {
      this.startPolling();
    });
  }

  on () {
		return this.events.on.apply(this.events, arguments);
	}

  startPolling () {
    console.log(TAG, 'Begin Update polling for Thermostat...');
    setInterval (function () {
      getThermostatState ().then((data) => {
        this.events.emit('state update', {
          mode: data.tmode,
          current_temp: data.temp,
          target_temp: data.t_cool || data.t_heat,
          fan_mode: data.fmode,
          hold_mode: data.hold
        });
      })
    }, poll_delay * 1000);
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

}
module.exports = ThermostatWiFiDriver;
