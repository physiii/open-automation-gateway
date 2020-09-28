const express = require('express'),
  app = express(),
  path = require('path'),
  server = require('http').createServer(app),
  io = require('socket.io')(server),
  port = process.env.PORT || 3000,
  ConnectionManager = require('../services/connection.js'),
  DeviceUtils = require('../services/device-utils.js'),
	DevicesManager = require('../devices/devices-manager.js'),
  System = require('../services/system.js'),
  database = require('../services/database.js'),
  INDEX_LOOP_TIME = 20;

let TAG = "[index]";

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {

  indexLoop();
  function indexLoop() {
    ConnectionManager.scanWifi().then(function(result) {
      socket.emit('router list',result);
    }, function(err) {
        console.log(err);
    })
    setTimeout(function () {
      indexLoop();
    }, INDEX_LOOP_TIME*1000);
  }

  database.getDeviceID().then(function(device_id) {
      socket.emit('device_id',device_id);
  }, function(err) {
      console.log(err);
  })

  database.getDevices().then(function(devices) {
      socket.emit('device list',devices);
  }, function(err) {
      console.log(err);
  })

  database.getGatewayID().then(function(gateway_id) {
      socket.emit('gateway_id',gateway_id);
      //console.log(device_id);
  }, function(err) {
      console.log(err);
  })

  socket.on('store ap', (apInfo) => {
    console.log(TAG,"apInfo", apInfo);
    ConnectionManager.setWifi(apInfo);
  });

  socket.on('searchForNetworkThermostats', () => {
    console.log(TAG,"Searching for network thermostats.");
    DeviceUtils.searchForNetworkThermostats();
  });

  socket.on('searchForLocalCameras', () => {
    console.log(TAG,"Searching for local cameras.");
    DeviceUtils.searchForAndCreateDevices();
  });

  socket.on('removeDevice', (deviceId) => {
    console.log(TAG,"Removing ");
    DeviceUtils.removeDevice(deviceId);
  });

});
