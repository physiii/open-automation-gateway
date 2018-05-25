const noOp = () => {};

class ServiceApi {
	constructor (socket, serviceId, eventNamespace) {
		this.socket = socket;
		this.eventPrefix = eventNamespace + '/' + serviceId;
	}

	on (event, localCallback) {
		this.socket.on(this.eventPrefix + '/' + event, (data, remoteCallback) => {
			// Ensure callback is always a function so we don't have to check that it is anywhere else.
			const callback = typeof remoteCallback === 'function' ? remoteCallback : noOp;

			localCallback.call(this, data, callback);
		});
	}
}

module.exports = ServiceApi;
