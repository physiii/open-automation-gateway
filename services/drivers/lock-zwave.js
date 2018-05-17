const zwave = require('../../zwave.js').zwave,
  EventEmitter = require('events'),
	zCommandClass = 98,
	zInstance = 1,
	zLockedIndex = 0,
	TAG = '[ZwaveLockDriver]';

class ZwaveLockDriver {
	constructor (nodeId) {
		this.id = nodeId;
		this.events = new EventEmitter();

		this.listenForZwaveChanges();
	}

  on () {
    return this.events.on.apply(this.events, arguments);
  }

	lock () {
		zwave.setValue(this.id, zCommandClass, zInstance, zLockedIndex, true);
	}

	unlock () {
		zwave.setValue(this.id, zCommandClass, zInstance, zLockedIndex, false);
	}

	listenForZwaveChanges () {
		zwave.on('value changed', (nodeId, comClass, value) => {
			if (nodeId !== this.id) {
				return;
			}

			if (this.isLockEvent(value.label, value.value)) {
				this.events.emit('locked');
			} else if (this.isUnlockEvent(value.label, value.value)) {
				this.events.emit('unlocked');
			}
		});
	}

	isLockEvent (label, value) {
	  if (label != 'Alarm Type') return false;
	  if (value == '21') return true;
	  if (value == '24') return true;
	  return false;
	}

	isUnlockEvent (label, value) {
	  if (label != 'Alarm Type') return false;
	  if (value == '19') return true;
	  if (value == '22') return true;
	  if (value == '25') return true;
	  return false;
	}
}

module.exports = ZwaveLockDriver;
