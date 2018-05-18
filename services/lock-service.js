const Service = require('./service.js'),
	TAG = '[LockService]';

class LockService extends Service {
	constructor (data, driverClass) {
		super(data);

		this.zwave_node_id = data.zwave_node_id;
		this.locked = data.locked || false;
		this.settings.relock_timer = data.settings && data.settings.relock_timer || false;

		this.driver = new driverClass(this.zwave_node_id);
		this.subscribeToDriver();
	}

	subscribeToDriver () {
		this.driver.on('locked', () => this.setLockState(true));
		this.driver.on('unlocked', () => this.setLockState(false));
	}

	lock () {
		this.driver.lock();
	}

	unlock () {
		this.driver.unlock();
	}

	onLock () {
		this.clearAutoRelock();
	}

	onUnlock () {
		this.setUpAutoRelock();
	}

	setLockState (isLocked) {
		if (!this.locked && isLocked) { // If changed from unlocked to locked.
			this.onLock();
		} else if (this.locked && !isLocked) { // If changed from locked to unlocked.
			this.onUnlock();
		}

		// Update locked state.
		this.locked = isLocked;
	}

	setUpAutoRelock(){
			if (this.settings.relock_timer === false) {
				return;
			}

			console.log(TAG, this.device.settings.name, 'Detected door unlocked. Setting relock timer.' + new Date());

			this.relock_timeout = setTimeout(() => {
				console.log(TAG, this.device.settings.name, 'Relocking door.' + new Date());
				this.lock();
			}, this.settings.relock_timer * 1000);
	}

	clearAutoRelock() {
		if (!this.relock_timeout) {
			return;
		}

		console.log(TAG, this.device.settings.name, 'Detected door locked. Removing relock timer.' + new Date());

		clearTimeout(this.relock_timeout);
	}
}

module.exports = LockService;
