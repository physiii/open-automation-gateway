//Placeholder for WiFi driver
const request = require('request'),
  EventEmitter = require('events'),
  TAG = '[ThermostatWiFiDriver]';

class ThermostatWiFiDriver {
  constructor(ip){
    this.ip = ip;
    this.events = new EventEmitter();
    this.ready = false;

  }

  getThermostatState(){
    return new Promise ((resolve, reject) => {
      request.get(
        'http://'+this.is+'/tstat',
        function(error, response, data){
          if (error){
            reject(error);
            return;
          }

          resolve(response, data)
          }
      })
    });
  }

  setCoolTemp(temperature){
    return new Promise((resolve, reject) => {
      request.post({
        headers: {'content-type' : 'application/x-www-form-urlencoded'},
        url:     'http://'+this.ip+'/tstat',
        body:    JSON.stringify({tmode: 2, t_cool: temperature })
      }, function (error, response, body) {
        if (error) {
          reject(error);
          return;
        }

        resolve(response, body);
      });
    });
  }

  setHeatTemp(temperature){
    return new Promise((resolve, reject) => {
      request.post({
        headers: {'content-type' : 'application/x-www-form-urlencoded'},
        url:     'http://'+this.ip+'/tstat',
        body:    JSON.stringify({tmode: 1, t_heat: temperature })
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
