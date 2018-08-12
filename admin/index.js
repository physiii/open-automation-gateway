// Setup basic express server
const express = require('express'),
  app = express(),
  path = require('path'),
  server = require('http').createServer(app),
  io = require('socket.io')(server),
  port = process.env.PORT || 3000,
  ConnectionManager = require('../services/connection.js'),
  System = require('../services/system.js'),
  database = require('../services/database.js');

let TAG = "[index]";

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {

  ConnectionManager.scanWifi().then(function(result) {
      socket.emit('router list',result);
      console.log(result);
  }, function(err) {
      console.log(err);
  })

  database.getDeviceID().then(function(device_id) {
      socket.emit('device_id',device_id);
      //console.log(device_id);
  }, function(err) {
      console.log(err);
  })

  socket.on('store ap', (apInfo) => {
    console.log(TAG,"apInfo", apInfo);
    ConnectionManager.setWifi(apInfo);
  });

});
