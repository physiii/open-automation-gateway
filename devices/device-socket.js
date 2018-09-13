const config = require('../config.json'),
	io = require('socket.io-client'),
	useDev = config.use_dev || false,
	useSsl = config.use_ssl || false,
	relayUrl = (useSsl ? 'https' : 'http') + '://' + config.relay_server + ':' + config.relay_port + '/device-relay',
	TAG = '[device-socket.js]';

function createDeviceSocket (deviceId, deviceToken) {
	const socket = io(relayUrl, {
		transportOptions: {
			polling: {
				extraHeaders: {
					'x-device-id': deviceId,
					'x-device-token': deviceToken,
					'x-device-type': 'gateway'
				}
			}
		},
		// Accept self-signed SSL certificates from relay for development.
		rejectUnauthorized: !useDev
	});

	socket.on('connect', () => console.log(TAG, deviceId, 'Device connected to relay.'));
	socket.on('disconnect', () => console.log(TAG, deviceId, 'Device was disconnected from relay.'));
	socket.on('reconnect_failed', () => console.log(TAG, deviceId, 'Device failed to reconnect to relay.'));
	socket.on('connect_error', (error) => console.error(TAG, deviceId, 'Error connecting device to relay:', error.type, error.description));

	return socket;
}

module.exports = {
	createDeviceSocket
};
