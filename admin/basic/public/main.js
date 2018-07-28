// Initialize variables
var $window = $(window);
var $routerPassword = $('#ap_password');
var $router_list = $("select[name='ap_list']")

var socket = io();

// stores router and password
const setRouterInfo = () => {
  ap_name = $router_list.val();
  ap_password = $routerPassword.val();
  console.log("router info: ",ap_name,ap_password);
  socket.emit('store ap', {ap_name:ap_name, ap_password:ap_password});
}

// Socket events

socket.on('router list', (data) => {
  console.log("router list: ",data);
  var optionsAsString = "";
  for(var i = 0; i < data.length; i++) {
      if (data[i].ssid.length < 2) continue;
      optionsAsString += "<option value='" + data[i].ssid + "'>" + data[i].ssid + "</option>";
  }
  $router_list.append( optionsAsString );
});


socket.on('disconnect', () => {
  log('you have been disconnected');
});

socket.on('reconnect', () => {
  log('you have been reconnected');
  if (username) {
    socket.emit('add user', username);
  }
});

socket.on('reconnect_error', () => {
  log('attempt to reconnect has failed');
});
