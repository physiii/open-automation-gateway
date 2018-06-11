/*
TODO:
-Create Database storage for previous found bridges.
-Create alternate connection HueApi that checks against any pre-existing Bridges

*/
const database = require('./database.js'),
  Service = require('./service.js'),
  hue = require ('node-hue-api'),
  hueApi = hue.HueApi,
  TAG = '[Hue.js]';

class HueBridgeService extends Service {
  constructor () {
    this.searchForBridge();
    this.api = new HueApi();

    this.registerUser(this.host, this.userDesc)
  }

  searchForBridge () {
    hue.nupnpSearch().then((bridge) => {
      this.displayBridges(bridge);
    }).then((bridge) => {
      this.host = bridge[0].ipaddress;
      console.log(TAG, 'Storing Bridge IP address at ' + this.host);
      this.userDesc = 'Device Description';
    });
  }

  displayBridges (bridge) {
    return new Promise(resolve,reject){
      console.log(TAG, 'Hue Bridges Found: ' + JSON.stringify(bridge));
      resolve(bridge);
    };
  }

  displayUserResults (result) {
    console.log(TAG, "Created user: " + JSON.stringify(result));
  }

  registerUser (host, userDesc) {
    this.api.registerUser(host, userDesc)
      .then(this.displayUserResults(result))
      .done()
  }

  addUser () {};

  removeUser () {};


}

module.exports = HueBridgeService;
