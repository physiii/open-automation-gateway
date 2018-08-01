const EventEmitter = require('events'),
	TAG = '[MockLockDriver]';

class MockLockDriver {
	constructor () {
		this.events = new EventEmitter();
		setTimeout(() => {
			this.events.emit('ready', {locked: true});
		}, 1000);
	}

	on () {
		return this.events.on.apply(this.events, arguments);
	}

	lock () {
		this.events.emit('locked');
	}

	unlock () {
		this.events.emit('unlocked');
	}
}

module.exports = MockLockDriver;
