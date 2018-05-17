const spawn = require('child_process').spawn,
	database = require('./database.js'),
	defaultStreamPort = 5054,
	defaultAudioDevice = config.device_hw || 'hw:0',
	defaultWidth = 640,
	defaultHeight = 480,
	defaultRotation = 0,
	TAG = '[VideoStreamer]';

class VideoStreamer {
	constructor () {
		this.ffmpegProcesses = {};
	}

	getStreamUrl (streamId) {
		const url = config.relay_server + ':' + (config.video_stream_port || defaultStreamPort) + '/' + database.settings.token + '/' + streamId + '/'; // TODO: urlify streamId (on relay too)

		if (!config.use_dev || config.use_ssl) {
			return 'https://' + url;
		} else if (config.use_dev && !config.use_ssl) {
			return 'http://' + url;
		}
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

	streamLive (streamId, videoDevice, {
		audioDevice = defaultAudioDevice,
		width = defaultWidth,
		height = defaultHeight,
		rotation = defaultRotation
	} = {}) {
		this.stream([
			'-f', 'alsa',
			'-i', audioDevice,
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
			'-r', '24',
			'-strict', '-1',
			this.getStreamUrl(streamId)
		], streamId);
	}

	streamFile (streamId, file) {
		this.stream([
			'-re',
			'-i', file,
			'-f', 'mpegts',
			'-codec:v', 'mpeg1video',
			'-b:v', '600k',
			'-strict', '-1',
			this.getStreamUrl(streamId)
		], streamId);
	}

	streamFiles (streamId, files) {
		// TODO
	}

	stream (command, streamId) {
		const existingProcess = this.ffmpegProcesses[streamId];

		if (existingProcess) {
			this.stop(streamId);
		}

		console.log(TAG, 'Starting ffmpeg stream.');
		const ffmpegProcess = spawn('ffmpeg', command);

		// Store a reference to this stream's ffmpeg process.
		this.ffmpegProcesses[streamId] = ffmpegProcess;

		// If ffmpeg exits, clean up.
		ffmpegProcess.on('close', (code) => {
			console.log(TAG, `ffmpeg exited with code ${code}.`);
			this.stop(streamId);
		});

		return ffmpegProcess;
	}

	stop (streamId) {
		const ffmpegProcess = this.ffmpegProcesses[streamId];

		console.log(TAG, 'Stopping ffmpeg stream.');

		if (ffmpegProcess && ffmpegProcess.kill) {
			ffmpegProcess.kill();
		}

		delete this.ffmpegProcesses[streamId];
	}
}

module.exports = new VideoStreamer();
