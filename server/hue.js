const hue = require ('node-hue-api'),
  HueApi = hue.HueApi,
  TAG = '[Hue.js]';

function linkBridge () {
  hue.nupnpSearch(function(err, result) {
    if (err) throw err;
    console.log(TAG, 'Bridge Information: ' + JSON.stringify(result));
  })
}

function createUser (device_ip) {
  api = new HueApi();
  api.createUser(device_ip, function(err, user) {
    if (err) throw err;
    console.log(TAG, "Created User: " + JSON.stringify(user));
  })
}

module.exports = {
  linkBridge,
  createUser
}
