const ServiceApi = require('./service-api.js'),
	CameraRecordings = require('../../camera-recordings.js');

class CameraApi extends ServiceApi {
	constructor (socket, camera) {
		super(socket, camera.id, 'camera');

		this.camera = camera;
		this.listen();
	}

	listen () {
		this.on('stream/live', (data, callback) => {
			this.camera.streamLive();
			// TODO: Error handling
			callback(null, this.camera.id);
		});

		this.on('stream/stop', (data, callback) => {
			this.camera.stopStream();
			// TODO: Error handling
			callback(null, this.camera.id);
		});

		this.on('preview/get', (data, callback) => {
			this.camera.getPreviewImage().then((image) => {
				callback(null, image);
			}).catch((error) => {
				callback(error);
			});
		});

		this.on('recordings/get', function (data, callback) {
			CameraRecordings.getRecordings(this.camera.id).then((recordings) => {
				callback(null, {recordings: recordings});
			}).catch((error) => {
				callback(error);
			});
		});

		this.on('recording/stream', (data, callback) => {
			CameraRecordings.streamRecording(data.recording_id).then(() => {
				callback(null, {recording_id: data.recording_id});
			}).catch((error) => {
				callback(error);
			});
		});

		this.on('recording/stream/stop', (data, callback) => {
			CameraRecordings.stopStream(data.recording_id);
			// TODO: Error handling

			callback(null, {recording_id: data.recording_id});
		});

		this.on('recordings/stream', (data, callback) => {
			// TODO: Figure out how to play multiple files with ffmpeg.
			// TODO: Perhaps make the stream id a concatenation of all of the recording ids.
		});

		this.on('recordings/stream/stop', (data, callback) => {
			// TODO
		});
	}
}

module.exports = CameraApi;
