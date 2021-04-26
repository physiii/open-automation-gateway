// Initialize variables
var $window = $(window);
var $routerPassword = $('#ap_password');
var $router_list = $("select[name='ap_list']")
var $device_list = $("#device_list")
var $linked_light_list = $("#linked_light_list")
var $light_list = $("#light_list")
var $lightController = $("#lightController")
var $light_input = $("#light_input")
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

const searchForHueBridges = () => {
  socket.emit('searchForHueBridges');
}

const searchForLights = () => {
  socket.emit('searchForLights');
}

const createLedController = () => {
  socket.emit('createLedController');
}

const removeDevice = (deviceId) => {
  socket.emit('removeDevice', deviceId);
}

const linkLightToController = () => {
  let controller = $("select[name='controllerList']").val(),
    lightId = Number($("select[name='lightList']").val()),
    bridgeUser = $("#bridgeUser").val();

  socket.emit('linkLightToController', {lightId, controller, bridgeUser});
}

const unlinkLightToController = (controller, lightId) => {
  socket.emit('unlinkLightToController', {lightId, controller});
}

const setRouterInfo = () => {
  if ($ssid_input.val() !== "") {
    ssid = $ssid_input.val();
  } else {
    ssid = $router_list.val();
  }

  password = $routerPassword.val();
  socket.emit('store ap', {ssid:ssid, password:password});
}

// Socket events
socket.on('router list', (data) => {
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
    if (data[i].services[0].settings.name) {
      rowsAsString += "<tr><td>" + data[i].services[0].settings.name + "</td><td>" + data[i].id
        + "</td><td><button type='button' onclick=\"removeDevice('" + data[i].id + "')\">remove</button></td></tr>";
      continue;
    }
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

socket.on('light list', (data) => {
  let input = "<input style='display:none' id=\"bridgeUser\" value='" + data.bridgeUser + "' />"
  let rowsAsString = input + "<table style='margin:15px;width:90%'>";
  rowsAsString += "<tr><th>Light ID</th><th>Controller UUID</th><th>Link / Unlink</th></tr>";

  let lightOptionsAsString = "<select name=\"lightList\">";
  for(var i = 0; i < data.lights.length; i++) {
    lightOptionsAsString += "<option value='" + data.lights[i]._data.id + "'>" + data.lights[i]._data.id + "</option>";
  }
  lightOptionsAsString = lightOptionsAsString + "</select>";

  let controllerOptionsAsString = "<select name=\"controllerList\">";
  for(var i = 0; i < data.controllers.length; i++) {
    controllerOptionsAsString += "<option value='"
      + data.controllers[i].id + "'>"
      + data.controllers[i].name + " - " + data.controllers[i].id
      + "</option>";
  }
  controllerOptionsAsString = controllerOptionsAsString + "</select>";

  rowsAsString += "<tr><td>" + lightOptionsAsString + "</td><td>" + controllerOptionsAsString
    + "</td><td><button type='button' onclick=\"linkLightToController()\">link</button></td></tr>";


  for(var i = 0; i < data.linkedLights.length; i++) {
    rowsAsString += "<tr><td>" + data.linkedLights[i].id + "</td><td>" + data.linkedLights[i].controller.name + " - " + data.linkedLights[i].controller.id
      + "</td><td><button type='button' onclick=\"unlinkLightToController('" + data.linkedLights[i].controller.id + "'," + data.linkedLights[i].id + ")\">unlink</button></td></tr>";
  }

  rowsAsString += "</table>";
  $light_list.html( rowsAsString );
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
