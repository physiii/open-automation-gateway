const zwave = require('../../zwave.js'),
	EventEmitter = require('events'),
	zDoorLockCC = 98,
	zDoorLockLocked = 0,
	zInstance = 1,
	zwaveDeadNotification = 5,
	zwaveAliveNotification = 6,
	TAG = '[ZwaveLockDriver]';

class ZwaveLockDriver {
	constructor (nodeId) {
		this.id = nodeId;
		this.events = new EventEmitter();
		this.ready = false;

		if (zwave.is_node_ready(this.id)) {
			this.onNodeReady();
		} else {
			zwave.on('node ready', (nodeId) => {
				if (nodeId !== this.id) {
					return;
				}

				this.onNodeReady();
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

	onNodeReady () {
		this.ready = true;
		this.events.emit('ready', {locked: zwave.get_value(this.id, zDoorLockCC, zDoorLockLocked)});
		this.listenForZwaveChanges();
	}

	listenForZwaveChanges () {
		const polledValuesCache = {};

		// Poll Door Lock Command Class / Locked for changes.
		zwave.poll(this.id, zDoorLockCC, zDoorLockLocked);
		zwave.on('value changed', (nodeId, commandClass, value) => {
			const cachedValueKey = String(commandClass) + '/' + String(value.index);

			if (nodeId !== this.id) {
				return;
			}

			// TODO: HACK DO NOT COMMIT
			if (value.label !== 'Locked') {
				return;
			}

			console.log(TAG, 'value changed?', commandClass, value.label, polledValuesCache[cachedValueKey] + ' -> ' + value.value);

			// Check to see if the value actually changed.
			if (polledValuesCache[cachedValueKey] === value.value) {
				return;
			}
			console.log(TAG, 'changed', commandClass, value.label, polledValuesCache[cachedValueKey] + ' -> ' + value.value);
			console.log('');

			polledValuesCache[cachedValueKey] = value.value;

			if (this.isLockEvent(commandClass, value)) {
				console.log(TAG, 'locked');
				this.events.emit('locked');
			} else if (this.isUnlockEvent(commandClass, value)) {
				console.log(TAG, 'unlocked');
				this.events.emit('unlocked');
			}
		});

		// Listen for node dead/alive notifications.
		zwave.on('notification', (nodeId, notification) => {
			if (nodeId !== this.id) {
				return;
			}

			switch (notification) {
				case zwaveDeadNotification:
					this.events.emit('timedout');
					break;
				case zwaveAliveNotification:
					this.events.emit('reconnected');
					break;
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
