const zwave = require('../../zwave.js').zwave;

class ZwaveLockDriver {
	constructor (nodeId) {
		this.id = nodeId;

		zwave.on('value added', (nodeId, comClass, value) => {
			if (nodeId !== this.id) {
				return;
			}

			// Locky stuff
		});
	}
}

module.exports = ZwaveLockDriver;
