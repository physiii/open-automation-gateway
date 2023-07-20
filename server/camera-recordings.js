	const database = require('./services/database.js'),
	VideoStreamer = require('./video-streamer.js'),
	fs = require('fs'),
	spawn = require('child_process').spawn,
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

	getLastRecording (cameraId) {
		return new Promise((resolve, reject) => {
			database.get_camera_recordings(cameraId).then((recordings) => {
				resolve(recordings.pop());
			}).catch((error) => {
				console.error(TAG, error);
				reject(error);
			});
		});
	}

	getRecordingById (recordingId) {
		return new Promise((resolve, reject) => {
			database.get_camera_recording(recordingId).then(resolve).catch((error) => {
				console.error(TAG, error);
				reject(error);
			});
		});
	}

	saveRecording (data) {
		database.set_camera_recording(data);
	}

	uploadRecording (file, cameraId, startDate, motionDetected, token) {
		let
			url = 'http://' + RELAY_SERVER + ':' + RELAY_PORT + '/service-content/upload-hls-recording',
			info = {cameraId, startDate, motionDetected},
			options = [
					'-X', 'POST',
					'-F', JSON.stringify(info) + '=@' + file,
					// '-F', cameraId + '=@' + startDate + '/' + file,
					// '-d', 'testkey1=val1&testkey2=val2',
					url
				],
			curl = spawn('curl', options);

		curl.on('close', (code) => {
			console.log(TAG, 'uploadRecording', file, startDate, cameraId, token);
		});
	}

	streamRecording (recordingId, streamToken, time = 0) {
		return new Promise((resolve, reject) => {
			this.getRecordingById(recordingId).then((recording) => {
				VideoStreamer.streamFile(recording.id, streamToken, recording.file, time);
				resolve(recordingId);
			}).catch((error) => {
				console.error(TAG, error);
				reject(error);
			});
		});
	}

	streamAudioRecording (recordingId, streamToken) {
		return new Promise((resolve, reject) => {
			this.getRecordingById(recordingId).then((recording) => {
				VideoStreamer.streamAudioFile(recording.id, streamToken, recording.file);
				resolve(recordingId);
			}).catch((error) => {
				console.error(TAG, error);
				reject(error);
			});
		});
	}

	getRecording (recordingId) {
		const error_message = 'There was an error retrieving the recording.';

		return new Promise((resolve, reject) => {
			this.getRecordingById(recordingId).then((recording) => {
				const url = 'http://' + RELAY_SERVER + ':' + RELAY_PORT + '/service-content/upload-recording',
					fileName = recording.file.split('/'),
					curl = spawn('curl', [
						'-X', 'POST',
						'-F', recordingId + '=@' + recording.file,
						url
					]);

				curl.on('close', (code) => {
					resolve({ file: fileName[fileName.length - 1], id: recordingId });
				});

			}).catch((error) => {
				console.error(TAG, error);
				reject(error);
			});
		});
	}

	stopStream (recordingId) {
		VideoStreamer.stop();
	}
}

module.exports = new CameraRecordings();
