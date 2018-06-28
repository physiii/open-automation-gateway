const config = require('../config.json'),
	io = require('socket.io-client'),
	useDev = config.use_dev || false,
	useSsl = config.use_ssl || false,
	relayProtocol = useSsl ? 'https' : 'http',
	TAG = '[device-socket.js]';
let relayPort = config.relay_port,
	relayUrl;

// Set dev port.
if (useDev && useSsl) {
	relayPort = 4443;
} else if (useDev && !useSsl) {
	relayPort = 5000;
}

relayUrl = relayProtocol + '://' + config.relay_server + ':' + relayPort;

function createDeviceSocket (deviceId) {
	const socket = io(relayUrl);

	socket.on('disconnect', () => console.log(TAG, deviceId, 'Device was disconnected from relay.'));
	socket.on('reconnect_failed', () => console.log(TAG, deviceId, 'Device failed to reconnect to relay.'));
	socket.on('connect_error', (error) => console.error(TAG, deviceId, 'Error connecting device to relay:', error.type, error.description));

	return socket;
}

module.exports = {
	createDeviceSocket
};
