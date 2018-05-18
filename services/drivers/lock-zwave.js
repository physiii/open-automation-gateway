const zwave = require('../../zwave.js'),
  EventEmitter = require('events'),
	zDoorLockCC = 98,
	zDoorLockLocked = 0,
	zInstance = 1,
	TAG = '[ZwaveLockDriver]';

class ZwaveLockDriver {
	constructor (nodeId) {
		this.id = nodeId;
		this.events = new EventEmitter();

		if (zwave.is_node_ready(this.id)) {
			this.listenForZwaveChanges();
		} else {
			zwave.on('node ready', (nodeId) => {
				if (nodeId !== this.id) {
					return;
				}

				this.listenForZwaveChanges();
			});
		}
	}

	on () {
		return this.events.on.apply(this.events, arguments);
	}

	lock () {
		zwave.set_value(this.id, zDoorLockCC, zInstance, zDoorLockLocked, true);
	}

	unlock () {
		zwave.set_value(this.id, zDoorLockCC, zInstance, zDoorLockLocked, false);
	}

	listenForZwaveChanges () {
		const polledValuesCache = {};

		// TODO: Get the current locked state from zwave.

		// Poll Door Lock Command Class / Locked for changes.
		zwave.poll(this.id, zDoorLockCC, zDoorLockLocked);
		zwave.on('value changed', (nodeId, commandClass, value) => {
			const cachedValueKey = String(commandClass) + '/' + String(value.index);

			if (nodeId !== this.id) {
				return;
			}

			// Check to see if the value actually changed.
			if (polledValuesCache[cachedValueKey] === value.value) {
				return;
			}
			polledValuesCache[cachedValueKey] = value.value;

			if (this.isLockEvent(commandClass, value)) {
				this.events.emit('locked');
			} else if (this.isUnlockEvent(commandClass, value)) {
				this.events.emit('unlocked');
			}
		});
	}

	isLockEvent (commandClass, value) {
		return (value.index === zDoorLockLocked) && value.value;
	}

	isUnlockEvent (commandClass, value) {
		return (value.index === zDoorLockLocked) && !value.value;
	}
}

module.exports = ZwaveLockDriver;
