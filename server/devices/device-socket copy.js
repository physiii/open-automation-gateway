const io = require('socket.io-client'),
	relayUrl = (USE_SSL ? 'https' : 'http') + '://' + RELAY_SERVER + ':' + RELAY_PORT + '/device-relay',
	deviceType = 'gateway',
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
		rejectUnauthorized: !USE_DEV
	});


// const headers = {
//   'x-device-id': deviceId,
//   'x-device-token': deviceToken,
//   'x-device-type': deviceType
// };

// // Connect to the WebSocket server
// const socket = io(relayUrl, {
//   transports: ['websocket'],
//   query: headers
// });

// Listen to events
// socket.on('connect', () => {
//   console.log('!! -- HIT -- !! Connected to relay.');
// });


	return socket;
}

module.exports = {
	createDeviceSocket
};
