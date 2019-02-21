// Initialize variables
var $window = $(window);
var $routerPassword = $('#ap_password');
var $router_list = $("select[name='ap_list']")
var $device_id = $('#device_id');
var $gateway_id = $('#gateway_id');
var socket = io();

// stores router and password
const setRouterInfo = () => {
  ssid = $router_list.val();
  password = $routerPassword.val();
  console.log("router info: ",ssid,password);
  socket.emit('store ap', {ssid:ssid, password:password});
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

socket.on('device_id', (device_id) => {
  console.log("device_id: ",device_id);
  $device_id.html( device_id );
});

socket.on('gateway_id', (device_id) => {
  console.log("gateway_id: ",device_id);
  $gateway_id.html( device_id );
});

socket.on('disconnect', () => {});
socket.on('reconnect', () => {});
socket.on('reconnect_error', () => {});
