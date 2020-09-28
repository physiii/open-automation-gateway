// Initialize variables
var $window = $(window);
var $routerPassword = $('#ap_password');
var $router_list = $("select[name='ap_list']")
var $device_list = $("#device_list")
var $ssid_input = $("#ssid_input")
var $device_id = $('#device_id');
var $gateway_id = $('#gateway_id');
var socket = io();

const searchForNetworkThermostats = () => {
  socket.emit('searchForNetworkThermostats');
}

const searchForLocalCameras = () => {
  socket.emit('searchForLocalCameras');
}

const removeDevice = (deviceId) => {
  socket.emit('removeDevice', deviceId);
}

const setRouterInfo = () => {
  if ($ssid_input.val() !== "") {
    ssid = $ssid_input.val();
  } else {
    ssid = $router_list.val();
  }

  password = $routerPassword.val();
  console.log("router info: ",ssid,password);
  socket.emit('store ap', {ssid:ssid, password:password});
}

// Socket events
socket.on('router list', (data) => {
  let optionsAsString = "";
  for(var i = 0; i < data.length; i++) {
      if (data[i].ssid.length < 2) continue;
      if (optionsAsString.indexOf(data[i].ssid) > 0) continue;
      optionsAsString += "<option value='" + data[i].ssid + "'>" + data[i].ssid + "</option>";
  }
  $router_list.html( optionsAsString );
});

socket.on('device list', (data) => {
  let rowsAsString = "<table style='margin:15px;width:90%'>";
  rowsAsString += "<tr><th>Device Name</th><th>UUID</th><th>Remove</th></tr>";

  for(var i = 0; i < data.length; i++) {
    if (!data[i].settings.name) {
      rowsAsString += "<tr><td>Gateway</td><td>" + data[i].id
        + "</td><td><button type='button' onclick=\"removeDevice('" + data[i].id + "')\">remove</button></td></tr>";
      continue;
    }
    rowsAsString += "<tr><td>" + data[i].settings.name + "</td><td>" + data[i].id
      + "</td><td><button type='button' onclick=\"removeDevice('" + data[i].id + "')\">remove</button></td></tr>";
  }
  rowsAsString += "</table>";
  $device_list.html( rowsAsString );
});

socket.on('device_id', (device_id) => {
  $device_id.html( device_id );
});

socket.on('gateway_id', (device_id) => {
  $gateway_id.html( device_id );
});

socket.on('disconnect', () => {});
socket.on('reconnect', () => {});
socket.on('reconnect_error', () => {});
