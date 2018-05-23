const config = require('../config.json'),
	socketIo = require('socket.io-client'),
	useDev = config.use_dev || false,
	useSsl = config.use_ssl || false,
	relayProtocol = useSsl ? 'https' : 'http';
let relayPort = config.relay_port,
	relayUrl;

// Set dev port.
if (useDev && useSsl) {
	relayPort = 4443;
} else if (useDev && !useSsl) {
	relayPort = 5000;
}

relayUrl = relayProtocol + '://' + config.relay_server + ':' + relayPort;

function createDeviceSocket (deviceId, callback) {
	const socket = socketIo(relayUrl);
	socket.emit('gateway/device/connect', {id: deviceId}, callback);
	return socket;
}

module.exports = {
	createDeviceSocket
};
