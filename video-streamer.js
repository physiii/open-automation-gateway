const spawn = require('child_process').spawn,
	config = require('./config.json'),
	defaultStreamPort = 5054,
	defaultWidth = 640,
	defaultHeight = 480,
	defaultRotation = 0,
	TAG = '[VideoStreamer]';

class VideoStreamer {
	constructor () {
		this.ffmpegProcesses = {};
	}

	getStreamUrl (streamId, streamToken) {
		const url = config.relay_server + ':' + (config.video_stream_port || defaultStreamPort) + '/' + streamId + '/' + streamToken + '/';

		if (config.use_ssl) {
			return 'https://' + url;
		} else {
			return 'http://' + url;
		}
	}

	streamLive (streamId, streamToken, videoDevice, {
		audioDevice,
		width = defaultWidth,
		height = defaultHeight,
		rotation = defaultRotation
	} = {}) {
		const options = [
			'-s', width + 'x' + height,
			'-f', 'v4l2',
			'-i', videoDevice,
			'-f', 'mpegts',
			'-vf', this.getRotationFromDegrees(rotation),
			'-codec:a', 'mp2',
			'-ar', '44100',
			'-ac', '1',
			'-b:a', '128k',
			'-codec:v', 'mpeg1video',
			'-b:v', '600k',
			'-strict', '-1',
			this.getStreamUrl(streamId, streamToken)
		];

		// Enable audio on the stream if the audio device is provided or set in config.
		if (audioDevice || config.device_hw) {
			options.unshift(
				'-f', 'alsa',
				'-i', audioDevice || config.device_hw
			);
		}

		this.stream(options, streamId);
	}

	streamFile (streamId, streamToken, file) {
		this.stream([
			'-re',
			'-i', file,
			'-f', 'mpegts',
			'-codec:v', 'mpeg1video',
			'-b:v', '600k',
			'-strict', '-1',
			this.getStreamUrl(streamId, streamToken)
		], streamId);
	}

	streamFiles (streamId, streamToken, files) {
		// TODO
	}

	stream (command, streamId) {
		const existingProcess = this.ffmpegProcesses[streamId];

		if (existingProcess) {
			this.stop(streamId).then(() => {
				this.start(command, streamId);
			});
		} else {
			this.start(command, streamId);
		}
	}

	start (command, streamId) {
		console.log(TAG, 'Starting ffmpeg stream.');
		const ffmpegProcess = spawn('ffmpeg', command);

		// Store a reference to this stream's ffmpeg process.
		this.ffmpegProcesses[streamId] = ffmpegProcess;

		// If ffmpeg exits, clean up.
		ffmpegProcess.on('close', (code) => {
			console.log(TAG, `ffmpeg exited with code ${code}.`);

			// Attach a flag to the child process object so we know it's closed.
			ffmpegProcess.isClosed = true;

			this.stop(streamId);
		});
	}

	stop (streamId) {
		const promise = new Promise((resolve, reject) => {
			const ffmpegProcess = this.ffmpegProcesses[streamId];

			if (ffmpegProcess && ffmpegProcess.kill && !ffmpegProcess.isClosed) {
				console.log(TAG, 'Stopping ffmpeg stream.');

				ffmpegProcess.on('close', () => {
					resolve();
				});

				ffmpegProcess.kill();
			} else {
				resolve();
			}
		});

		promise.then(() => delete this.ffmpegProcesses[streamId]);

		return promise;
	}

	getRotationFromDegrees (degree) {
		switch (Number(degree)) {
			case 90:
				return 'transpose=2';
			case 180:
				return 'transpose=2,transpose=2';
			case 270:
				return 'transpose=1';
			case 0:
			default:
				return 'transpose=2,transpose=1';
		}
	}
}

module.exports = new VideoStreamer();
