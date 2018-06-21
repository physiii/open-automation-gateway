//Placeholder for WiFi driver
const request = require('request'),
  EventEmitter = require('events'),
  poll_delay = 5 * 1000,
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
    if (mode == 'off') let mode = 0;
    if (mode == 'heat') let mode = 1;
    if (mode == 'cool') let mode = 2;
    if (mode == 'auto') let mode = 3;

    return new Promise((resolve, reject) => {
      request.post({
        headers: {'content-type' : 'application/x-www-form-urlencoded'},
        url:     'http://'+this.ip+'/tstat',
        body:    JSON.stringify({ tmode: mode })
      }, function (error, response, body) {
        if (error) {
          reject(error);
          return;
        }
        console.log(TAG, 'setCoolTemp',response, body )
        resolve(response, body);
      });
    });
  }

  setTemp (mode, temperature) {
    if (mode == 'heat') {
      return new Promise((resolve, reject) => {
        request.post({
          headers: {'content-type' : 'application/x-www-form-urlencoded'},
          url:     'http://'+this.ip+'/tstat',
          body:    JSON.stringify({ tmode: 1, t_heat: temperature })
        }, function (error, response, body) {
          if (error) {
            reject(error);
            return;
          }
          console.log(TAG, 'setTemp',response, body )
          resolve(response, body);
          return;
        });
      });
    };
    if (mode == 'cool'){
      return new Promise((resolve, reject) => {
        request.post({
          headers: {'content-type' : 'application/x-www-form-urlencoded'},
          url:     'http://'+this.ip+'/tstat',
          body:    JSON.stringify({ tmode: 2, t_cool: temperature })
        }, function (error, response, body) {
          if (error) {
            reject(error);
            return;
          }
          console.log(TAG, 'setTemp',response, body )
          resolve(response, body);
          return;
        });
      });
    };
    console.log(TAG, 'Mode not heat or cool. Further functions not configured.')
  }

  setHoldMode (mode) {
    if (mode === 'on') {
      return new Promise((resolve, reject) => {
        request.post({
          headers: {'content-type' : 'application/x-www-form-urlencoded'},
          url:     'http://'+this.ip+'/tstat',
          body:    JSON.stringify({hold: 1 })
        }, function (error, response, body) {
          if (error) {
            reject(error);
            return;
          }
          this.settings.hold_mode = 'on';
          resolve(response, body);
        });
      });
    } else if ( mode === 'off') {
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
          this.settings.hold_mode = 'off';
          resolve(response, body);
        });
      });
    } else {
      console.log (TAG, 'Selected Fan Mode doesnt exist')
      return;
    }
  }

  setFanMode (mode) {
    if (mode === 'on') {
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
    };
    if (mode === 'auto') {
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
    };
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
    let settings = {
      mode: data.tmode,
      fan_mode: data.fmode,
      hold_mode: data.hold,
      current_temp: data.temp,
      target_temp: data.t_cool || data.t_heat,
    };

    if (settings.mode == '0') settings.mode = 'off';
    if (settings.mode == '1') settings.mode = 'heat';
    if (settings.mode == '2') settings.mode = 'cool';
    if (settings.mode == '3') settings.mode = 'auto';
    if (settings.fan_mode == '1') settings.fan_mode = 'auto';
    if (settings.fan_mode == '2') settings.fan_mode = 'on';
    if (settings.hold_mode == '0')settings.hold_mode = 'off';
    if (settings.hold_mode == '1')settings.hold_mode = 'on';

    return settings;
  }
}

module.exports = ThermostatWiFiDriver;
