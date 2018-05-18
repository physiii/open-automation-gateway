const Service = require('./service.js'),
	TAG = '[LockService]';

class LockService extends Service {
	constructor (data, driverClass) {
		super(data);

		this.zwave_node_id = data.zwave_node_id;
		this.locked = data.locked || false;
		this.available = data.available || false;
		this.settings.relock_timer = data.settings && data.settings.relock_timer || false;

		this.driver = new driverClass(this.zwave_node_id);
		this.subscribeToDriver();
	}

	subscribeToDriver () {
		this.driver.on('ready', (data) => this.onReady(data));
		this.driver.on('timedout', () => this.onTimeout());
		this.driver.on('reconnected', () => this.onConnected());
		this.driver.on('locked', () => this.setLockedState(true));
		this.driver.on('unlocked', () => this.setLockedState(false));
	}

	onReady (data) {
		this.onConnected();
		this.locked = data.locked;
	}

	onConnected () {
		this.available = true;
	}

	onTimeout () {
		this.available = false;
	}

	onLock () {
		this.clearAutoRelock();
	}

	onUnlock () {
		this.setUpAutoRelock();
	}

	lock () {
		this.driver.lock();
	}

	unlock () {
		this.driver.unlock();
	}

	setLockedState (isLocked) {
		if (!this.locked && isLocked) { // If changed from unlocked to locked.
			this.onLock();
		} else if (this.locked && !isLocked) { // If changed from locked to unlocked.
			this.onUnlock();
		}

		// Update locked state.
		this.locked = isLocked;
	}

	setUpAutoRelock (isSubsequentTry) {
		if (this.settings.relock_timer === false) {
			return;
		}

		if (!isSubsequentTry) {
			console.log(
				TAG,
				'Door unlocked'
				+ (this.device.settings.name ? (' (' + this.device.settings.name + ')') : '')
				+ '. Setting relock timer. '
				+ new Date()
			);
		}

		this.relock_timeout = setTimeout(() => {
			console.log(
				TAG,
				'Relocking door'
				+ (this.device.settings.name ? (' (' + this.device.settings.name + ')') : '')
				+ '.'
				+ new Date()
			);

			this.relock_timeout = null;
			this.lock();

			// Try to auto-relock again. This covers scenarios where the lock 
			// is unlocked again during window between relock and the next poll.
			this.setUpAutoRelock(true);
		}, this.settings.relock_timer * 1000);
	}

	clearAutoRelock () {
		if (!this.relock_timeout) {
			return;
		}

		console.log(
			TAG,
			'Door locked'
			+ (this.device.settings.name ? (' (' + this.device.settings.name + ')') : '')
			+ '. Removing relock timer. '
			+ new Date()
		);

		clearTimeout(this.relock_timeout);
		this.relock_timeout = null;
	}
}

module.exports = LockService;
