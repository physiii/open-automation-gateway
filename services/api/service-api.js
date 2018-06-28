const noOp = () => {};

class ServiceApi {
	constructor (socket, service, eventNamespace) {
		this.socket = socket;
		this.eventPrefix = eventNamespace + '/' + service.id;

		this.sendState = this.sendState.bind(this);

		// When the service's state changes, send the new state to relay.
		service.onStateChange(this.sendState);
	}

	on (event, localCallback) {
		this.socket.on(this.eventPrefix + '/' + event, (data, remoteCallback) => {
			// Ensure callback is always a function so we don't have to check that it is anywhere else.
			const callback = typeof remoteCallback === 'function' ? remoteCallback : noOp;

			localCallback.call(this, data, callback);
		});
	}

	sendState (state) {
		this.socket.emit(this.eventPrefix + '/state', {state});
	}
}

module.exports = ServiceApi;
