const noOp = () => {};

class ServiceApi {
	constructor (socket, service, eventNamespace) {
		this.socket = socket;
		this.eventPrefix = eventNamespace + '/' + service.id;

		this.emit = this.emit.bind(this);
		this.sendState = this.sendState.bind(this);

		// When the service's state changes, send the new state to relay.
		service.on('state-changed', this.sendState);

		this.on('setting', (data, callback) => {
			service.saveSetting(data.property, data.value).then(() => callback()).catch(callback);
		});
		this.on('settings', (data, callback) => {
			service.saveSettings(data.settings).then(() => callback()).catch(callback);
		});
	}

	on (event, localCallback) {
		this.socket.on(this.eventPrefix + '/' + event, (data, remoteCallback) => {
			// Ensure callback is always a function so we don't have to check that it is anywhere else.
			const callback = typeof remoteCallback === 'function' ? remoteCallback : noOp;

			localCallback.call(this, data, callback);
		});
	}

	emit (event, data, callback) {
		this.socket.emit(this.eventPrefix + '/' + event, data, callback);
	}

	sendState (data) {
		this.emit('state', {state: data.state});
	}
}

module.exports = ServiceApi;
