const Service = require('./service.js'),
	ZwaveLockDriver = require('./drivers/lock-zwave.js'),
	MockLockDriver = require('./drivers/lock-mock.js'),
	LockApi = require('./api/lock-api.js'),
	TAG = '[LockService]';

class LockService extends Service {
	constructor (data, relaySocket, save) {
		super(data, relaySocket, save, LockApi);

		this.zwave_node_id = data.zwave_node_id;
		this.state.locked = data.state && data.state.locked;
		this.available = data.available || false;
		this.settings.relock_delay = data.settings && data.settings.relock_delay || false;

		if (this.zwave_node_id) {
			this.driver = new ZwaveLockDriver(this.zwave_node_id);
		} else {
			this.driver = new MockLockDriver();
		}

		this.subscribeToDriver();
	}

	subscribeToDriver () {
		this.driver.on('ready', (data) => this.onReady(data));
		this.driver.on('timedout', () => this.onTimeout());
		this.driver.on('reconnected', () => this.onConnected());
		this.driver.on('locked', () => this.onLockedStateChange(true));
		this.driver.on('unlocked', () => this.onLockedStateChange(false));
	}

	onReady (data) {
		this.onConnected();
		this.state.locked = data.locked;
	}

	onConnected () {
		this.available = true;
	}

	onTimeout () {
		this.available = false;
	}

	onLocked () {
		this.clearAutoRelock();
	}

	onUnlocked () {
		this.setUpAutoRelock();
	}

	lock () {
		this.driver.lock();
	}

	unlock () {
		this.driver.unlock();
	}

	setRelockDelay (delay) {
		return this.settings.relock_delay = delay;
	}

	onLockedStateChange (isLocked) {
		if (!this.state.locked && isLocked) { // If changed from unlocked to locked.
			this.onLocked();
		} else if (this.state.locked && !isLocked) { // If changed from locked to unlocked.
			this.onUnlocked();
		}

		// Update locked state.
		this.state.locked = isLocked;
	}

	setUpAutoRelock (isSubsequentTry) {
		if (this.settings.relock_delay === false) {
			return;
		}

		if (!isSubsequentTry) {
			console.log(
				TAG,
				'Door unlocked'
				+ (this.settings.name ? (' (' + this.settings.name + ')') : '')
				+ '. Setting relock timer. '
				+ new Date()
			);
		}

		this.relockTimeout = setTimeout(() => {
			console.log(
				TAG,
				'Relocking door'
				+ (this.settings.name ? (' (' + this.settings.name + ')') : '')
				+ '.'
				+ new Date()
			);

			this.relockTimeout = null;
			this.lock();

			// Try to auto-relock again. This covers scenarios where the lock
			// is unlocked again during window between relock and the next poll.
			this.setUpAutoRelock(true);
		}, this.settings.relock_delay * 1000);
	}

	clearAutoRelock () {
		if (!this.relockTimeout) {
			return;
		}

		console.log(
			TAG,
			'Door locked'
			+ (this.settings.name ? (' (' + this.settings.name + ')') : '')
			+ '. Removing relock timer. '
			+ new Date()
		);

		clearTimeout(this.relockTimeout);
		this.relockTimeout = null;
	}

	dbSerialize () {
		return {
			...Service.prototype.dbSerialize.apply(this, arguments),
			zwave_node_id: this.zwave_node_id
		};
	}
}

module.exports = LockService;
