// Initialize variables
var $window = $(window);
var $routerPassword = $('#ap_password');
var $router_list = $("select[name='ap_list']")
var $currentInput = $usernameInput.focus();

var socket = io();

// stores router and password
const setRouterInfo = () => {
  ap_name = $router_list.val();
  ap_password = $routerPassword.val();
  console.log("router info: ",ap_name,ap_password);
  socket.emit('store ap', {ap_name:ap_name, ap_password:ap_password});
}

$window.keydown(event => {
  // Auto-focus the current input when a key is typed
  if (!(event.ctrlKey || event.metaKey || event.altKey)) {
    $currentInput.focus();
  }
  // When the client hits ENTER on their keyboard
  if (event.which === 13) {
    if (username) {
      sendMessage();
      socket.emit('stop typing');
      typing = false;
    } else {
      setUsername();
    }
  }
});

// Focus input when clicking anywhere on login page
$loginPage.click(() => {
  $currentInput.focus();
});

// Focus input when clicking on the message input's border
$inputMessage.click(() => {
  $inputMessage.focus();
});

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
