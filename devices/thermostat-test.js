var thermostat = require('./thermostat.js');
var request = require('request');

function add_test(){
  data = {local.ip: "127.0.0.1",};

  //Expect outcome variable outcume = '''

  var test = thermostat.add_thermostat(data);

  if(outcome === test) return console.log("Passed");
  console.log("Failed");


}
