const spawn = require('child_process').spawn,
	exec = require('child_process').exec,
	execFile = require('child_process').execFile,
	config = require('./config.json'),
	utils = require('./utils.js'),
	defaultStreamPort = 5054,
	defaultWidth = 640,
	defaultHeight = 480,
	defaultRotation = config.rotation || 0,
	TAG = '[VideoStreamer]';

let	audioStreamProcess,
	videoStreamProcess,
	fileStreamProcess,
	audioStreamId,
	videoStreamId,
	audioStreamToken = "init_audio_token",
	videoStreamToken = "init_video_token";

class VideoStreamer {
	getStreamUrl (streamId, streamToken) {
		const url = config.relay_server + ':' + (config.video_stream_port || defaultStreamPort) + '/' + streamId + '/' + streamToken + '/';

		if (config.use_ssl) {
			return 'https://' + url;
		} else {
			return 'http://' + url;
		}
	}

	getAudioVideoStreamUrl (streamId) {
		let audioUrl = config.relay_server + ':' + (config.video_stream_port || defaultStreamPort) + '/' + streamId + '/' + audioStreamToken + '/',
			videoUrl = config.relay_server + ':' + (config.video_stream_port || defaultStreamPort) + '/' + streamId + '/' + videoStreamToken + '/';

		if (config.use_ssl) {
			audioUrl = 'https://' + audioUrl;
			videoUrl = 'https://' + videoUrl;
		} else {
			audioUrl = 'http://' + audioUrl;
			videoUrl = 'http://' + videoUrl;
		}

		let url =  "[f=mpegts:select=v]" + videoUrl + "|" + "[f=mpegts:select=a]" + audioUrl;
		return url;
	}

	streamLive (streamId, streamToken, videoDevice, {
		audioDevice,
		width = defaultWidth,
		height = defaultHeight,
		rotation = defaultRotation
		} = {}) {

		videoStreamToken = streamToken;
		// ffmpeg -s 1280x720 -r 30 -f v4l2 -i /dev/video10 -f mpegts -vf transpose=2,transpose=1 -codec:a mp2 -ar 44100 -ac 1 -b:a 128k -codec:v mpeg1video -b:v 2000k -strict -1 test.avi
		let options = [
			'-f', 'v4l2',
				'-r', '15',
				'-s', width + 'x' + height,
				'-i', videoDevice,
			'-f', 'mpegts',
				'-vf', this.getRotationFromDegrees(rotation),
				'-codec:v', 'mpeg1video',
					'-s', width + 'x' + height,
					'-b:v', '1000k',
			'-q:v', '0',
			'-strict', '-1',
			this.getStreamUrl(streamId, streamToken)
		];

		this.printFFmpegOptions(options);

		if (videoStreamProcess) videoStreamProcess.kill();
		console.log(TAG, 'Starting audio stream stream. Stream ID:', streamId);
		videoStreamProcess = spawn('ffmpeg', options);

		videoStreamProcess.on('close', (code) => {
			console.log(TAG, `Audio stream exited with code ${code}. Stream ID:`, streamId);
		});
	}

	streamLiveAudio (streamId, streamToken, audioDevice) {

		audioStreamToken = streamToken;

		let options = [
			'-f', 'alsa',
				'-ar', '44100',
				// '-ac', '1',
				'-i', audioDevice,
			'-f', 'mpegts',
				'-codec:a', 'mp2',
					'-b:a', '128k',
			'-strict', '-1',
			this.getStreamUrl(streamId, streamToken)
			];

		this.printFFmpegOptions(options);

		if (audioStreamProcess) audioStreamProcess.kill();
		console.log(TAG, 'Starting live audio stream. Stream ID:', streamId);
		audioStreamProcess = spawn('ffmpeg', options);

		audioStreamProcess.on('close', (code) => {
			console.log(TAG, `Audio stream exited with code ${code}. Stream ID:`, streamId);
		});
	}

	streamAudioFile (streamId, streamToken, file) {

		audioStreamToken = streamToken;

		let options = [
			'-loglevel', 'panic',
			'-re',
			'-i', file,
			'-f', 'tee',
				'-codec:v', 'mpeg1video',
				'-q:v', '0',
				'-b:v', '900k',
				'-c:a', 'mp2',
				'-flags', '+global_header',
				'-b:a', '128k',
				'-map', '0:a',
				'-map', '0:v',
				'-r', '20',
			this.getAudioVideoStreamUrl(streamId)
		];

		let command = this.printFFmpegOptions(options);

		if (fileStreamProcess) fileStreamProcess.kill();

		console.log(TAG, 'Starting audio/video file stream. Stream ID:', command);

		fileStreamProcess = spawn('ffmpeg', options);
		fileStreamProcess.on('close', (code) => {
			console.log(TAG, `Audio/video file stream exited with code ${code}. Stream ID:`, streamId);
		});
	}

	streamFile (streamId, streamToken, file) {

		videoStreamToken = streamToken;

		let options = [
			'-loglevel', 'panic',
			'-re',
			'-i', file,
			'-f', 'tee',
				'-codec:v', 'mpeg1video',
				'-q:v', '0',
				'-b:v', '900k',
				'-c:a', 'mp2',
				'-flags', '+global_header',
				'-b:a', '128k',
				'-map', '0:a',
				'-map', '0:v',
				'-r', '20',
			this.getAudioVideoStreamUrl(streamId)
		];

		let command = this.printFFmpegOptions(options);

		if (fileStreamProcess) fileStreamProcess.kill();

		console.log(TAG, 'Starting file stream. Stream ID:', streamId);
		// fileStreamProcess = exec(command);

		fileStreamProcess = spawn('ffmpeg', options);
		fileStreamProcess.on('close', (code) => {
			console.log(TAG, `File stream exited with code ${code}. Stream ID:`, streamId);
		});
	}

	streamFiles (streamId, streamToken, files) {
		// TODO
	}

	stop (process) {
		if (audioStreamProcess) audioStreamProcess.kill();
		if (videoStreamProcess) videoStreamProcess.kill();
		if (fileStreamProcess) fileStreamProcess.kill();
	}

	printFFmpegOptions (options) {
		let options_str = 'ffmpeg';
		for (let i = 0; i < options.length; i++) {
			options_str += ' ' + options[i];
		}
		// console.log("printFFmpegOptions", options_str);
		return options_str;
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
