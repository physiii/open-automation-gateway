// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
var connection = require('../../connection.js');
var database = require('../../database.js');

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {


  var scanWifiPromise = connection.scan_wifi();
  scanWifiPromise.then(function(result) {
      socket.emit('router list',result);
      //console.log(result);
  }, function(err) {
      console.log(err);
  })

  var getDeviceIDPromise = database.getDeviceID();
  getDeviceIDPromise.then(function(device_id) {
      socket.emit('device_id',device_id);
      console.log(device_id);
  }, function(err) {
      console.log(err);
  })

  socket.on('store ap', (data) => {
    console.log("storing ap info: ",data);
    connection.set_wifi(data);
  });

});
