// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
var connection = require('../../connection.js');

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

// Chatroom

var numUsers = 0;

io.on('connection', (socket) => {
  var addedUser = false;

  var initializePromise = connection.scan_wifi();
  initializePromise.then(function(result) {
      socket.emit('router list',result);
      //console.log(result);
  }, function(err) {
      console.log(err);
  })

  socket.on('store ap', (data) => {
    console.log("storing ap info: ",data);
    connection.set_wifi(data);
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', () => {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
