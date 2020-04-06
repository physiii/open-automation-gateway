const ServiceApi = require('./service-api.js'),
	CameraRecordings = require('../../camera-recordings.js');

class CameraApi extends ServiceApi {
	listen () {
		ServiceApi.prototype.listen.call(this);

		this.on('stream/live', (data, callback) => {
			const stream_token = this.service.streamLive();

			// TODO: Error handling
			callback(null, {stream_token});
		});

		this.on('audio/stream/live', (data, callback) => {
			const stream_token = this.service.streamLiveAudio();

			// TODO: Error handling
			callback(null, {stream_token});
		});

		this.on('audio/stream/stop', (data, callback) => {
			this.service.audioStreamStop();
			// TODO: Error handling
			callback(null, {});
		});

		this.on('stream/stop', (data, callback) => {
			this.service.stopStream();
			// TODO: Error handling
			callback(null, {});
		});

		this.on('preview/get', (data, callback) => {
			this.service.getPreviewImage().then((image) => {
				callback(null, {preview: image});
			}).catch((error) => {
				callback(error);
			});
		});

		this.on('recordings/get', function (data, callback) {
			CameraRecordings.getRecordings(this.service.id).then((recordings) => {
				callback(null, {recordings: recordings});
			}).catch((error) => {
				callback(error);
			});
		});

		this.on('recording/stream', (data, callback) => {
			const stream_token = this.service.generateStreamToken();

			CameraRecordings.streamRecording(data.recording_id, stream_token).then(() => {
				callback(null, {stream_token});
			}).catch((error) => {
				callback(error);
			});
		});

		this.on('recording/stream/audio', (data, callback) => {
			const stream_token = this.service.generateStreamToken();

			CameraRecordings.streamAudioRecording(data.recording_id, stream_token).then(() => {
				callback(null, {stream_token});
			}).catch((error) => {
				callback(error);
			});
		});

		this.on('recording/stream/stop', (data, callback) => {
			CameraRecordings.stopStream(data.recording_id);
			// TODO: Error handling

			callback(null, {});
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
