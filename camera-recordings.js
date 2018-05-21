const database = require('./database.js'),
	VideoStreamer = require('../video-streamer.js'),
	TAG = '[CameraRecordings]';

class CameraRecordings {
	getRecordings (cameraId) {
		return new Promise((resolve, reject) => {
			database.get_camera_recordings(cameraId).then((recordings) => {
				resolve(recordings.map((recording) => {
					return {
						id: recording.id,
						camera_id: recording.camera_id,
						date: recording.date.toISOString(),
						duration: recording.duration,
						width: recording.width,
						height: recording.height
					};
				}));
			}).catch((error) => {
				console.error(TAG, error);
				reject(error);
			});
		});
	}

	getRecording (recordingId) {
		return new Promise((resolve, reject) => {
			database.get_camera_recording(recordingId).then(resolve).catch((error) => {
				console.error(TAG, error);
				reject(error);
			});
		});
	}

	streamRecording (recordingId) {
		return new Promise((resolve, reject) => {
			this.getRecording(recordingId).then((recording) => {
				VideoStreamer.streamFile(recording.id, recording.file);
				resolve(recordingId);
			}).catch((error) => {
				console.error(TAG, error);
				reject(error);
			});
		});
	}

	stopStream (recordingId) {
		VideoStreamer.stop(recordingId);
	}
}

module.exports = new CameraRecordings();
