const spawn = require('child_process').spawn,
	exec = require('child_process').exec,
	execSync = require('child_process').execSync,
	fs = require('fs'),
	execFile = require('child_process').execFile,
	config = require('./config.json'),
	utils = require('./utils.js'),
	defaultStreamPort = 5054,
	defaultWidth = 640,
	defaultHeight = 480,
	defaultRotation = config.rotation || 0,
	cameraStreamDir = "/tmp/open-automation/camera/stream/",
	HLS_LIST_SIZE = 10,
	HLS_TIME = 10,
	TAG = '[VideoStreamer]';

let	audioStreamProcess,
	videoStreamProcess,
	fileStreamProcess,
	watchStreamDir = {},
	audioStreamId,
	videoStreamId,
	isStreaming = false,
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

	//ffmpeg -thread_queue_size 32768 -i "http://xx/636.m3u8" -f hls -c:v copy -c:a copy -hls_time 5 -hls_list_size 5 -hls_allow_cache 0 -hls_flags delete_segments -segment_list_flags +live
	startNetworkStream (cameraId, rtspUrl) {
		const METHOD_TAG = TAG + '[' + cameraId + ']' + '[' + rtspUrl +']',
			streamDir = cameraStreamDir + cameraId,
			options = [
				'-i', rtspUrl,
				"-f", "hls",
				"-c:v", "copy",
				// "-c:a", "copy",
				"-hls_time", HLS_TIME,
				"-hls_list_size", HLS_LIST_SIZE,
				"-hls_delete_threshold", "1",
				"-hls_flags", "delete_segments",
				streamDir + "/playlist.m3u8"
			];

		execSync("mkdir -p " + streamDir);
		let ffmpegStr = "\"" + this.printFFmpegOptions(options) + "\"";


		// Check if stream is already running so we do not duplicate process
		utils.checkIfProcessIsRunning(ffmpegStr).then((processId) => {
			utils.killProcess(processId).then(() => {
				videoStreamProcess = spawn('ffmpeg', options);

				videoStreamProcess.on('close', (code) => {
					videoStreamProcess = null;
					console.error(METHOD_TAG, `RTSP stream exited with code ${code}`);
					setTimeout(() => {
						this.startNetworkStream(cameraId, rtspUrl);
					}, 10 * 1000);
				});

				videoStreamProcess.stderr.on('data', (data) => {
					// console.log(`${data}`);
				});

			});
		});
	}

	stopNetworkStream (cameraId) {
		if (watchStreamDir[cameraId]) {
			watchStreamDir[cameraId].close();
			delete watchStreamDir[cameraId];
		}
		console.log(TAG, "stopNetworkStream");
	}

	streamLive (streamId, streamToken, videoDevice, {
		audioDevice,
		width = defaultWidth,
		height = defaultHeight,
		rotation = defaultRotation
		} = {}) {

		isStreaming = true;
		videoStreamToken = streamToken;

		let options = [
			'-f', 'v4l2',
				'-r', '15',
				'-s', width + 'x' + height,
				'-i', videoDevice,
			'-f', 'mpegts',
				'-vf', this.getRotationFromDegrees(rotation),
				'-codec:v', 'mpeg1video',
					'-s', width + 'x' + height,
					'-b:v', '1m',
			'-q:v', '4',
			'-strict', '-1',
			this.getStreamUrl(streamId, streamToken)
		];
		// this.printFFmpegOptions(options);

		if (videoStreamProcess) videoStreamProcess.kill();
		console.log(TAG, 'Starting video stream stream. Stream ID:', streamId);
		videoStreamProcess = spawn('ffmpeg', options);

		videoStreamProcess.on('close', (code) => {

			if (isStreaming) {
				this.streamLive( streamId, streamToken, videoDevice, {width, height, rotation});
			}

			console.log(TAG, `Video stream exited with code ${code}. Stream ID:`, streamId);
		});
	}

	streamLiveAudio (streamId, streamToken, audioDevice, isNetworkCamera) {

		isStreaming = true;
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
			if (isStreaming) {
				this.streamLiveAudio(streamId, streamToken, audioDevice);
			}
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

	streamFile (streamId, streamToken, file, time) {

		console.log("TRANSPORTING VIDEO TO: ", time);
		let seconds = time % 60,
			minutes = Math.trunc(time / 60);

		videoStreamToken = streamToken;

		let options = [
			'-loglevel', 'panic',
			'-re',
			'-ss', '00:' + minutes + ':' + seconds,
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
		isStreaming = false;
		if (audioStreamProcess) audioStreamProcess.kill();
		if (videoStreamProcess) videoStreamProcess.kill();
		if (fileStreamProcess) fileStreamProcess.kill();
	}

	printFFmpegOptions (options, log=false) {
		let options_str = 'ffmpeg';
		for (let i = 0; i < options.length; i++) {
			options_str += ' ' + options[i];
		}
		if (log) console.log("printFFmpegOptions", options_str);
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
