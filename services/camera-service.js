const spawn = require('child_process').spawn,
	exec = require('child_process').exec,
	path = require('path'),
	Service = require('./service.js'),
	VideoStreamer = require('../video-streamer.js'),
	motionScriptPath = path.join(__dirname, '/../motion/motion.py'),
	TAG = '[CameraService]';

class CameraService extends Service {
	constructor (data) {
		super(data);

		this.os_device_path = data.os_device_path || '/dev/video0';

		// Settings
		this.settings.resolution_w = data.settings && data.settings.resolution_w || 640;
		this.settings.resolution_h = data.settings && data.settings.resolution_h || 480;
		this.settings.rotation = data.settings && data.settings.rotation || 0;

		this.TAG = TAG + ' ' + this.getCameraNumber();

		this.setUpLoopback();
		this.startMotionDetection();
	}

	getCameraNumber () {
		return this.os_device_path.substr(this.os_device_path.length - 1);
	}

	getLoopbackDevicePath () {
		return '/dev/video10' + this.getCameraNumber();
	}

	streamLive () {
		VideoStreamer.streamLive(
			this.id,
			this.getLoopbackDevicePath(),
			{
				width: this.settings.resolution_w,
				height: this.settings.resolution_h,
				rotation: this.settings.rotation
			}
		);
	}

	stopStream () {
		VideoStreamer.stop(this.id);
	}

	startMotionDetection () {
		const METHOD_TAG = this.TAG + ' [motion]',
			MOTION_TAG = METHOD_TAG + ' [motion.py]';

		this.isMotionDetectionStarted().then((isStarted) => {
			if (isStarted) {
				return console.log(METHOD_TAG, 'Motion detection already started.');
			}
			console.log(METHOD_TAG, 'Starting motion detection.');

			// Launch the motion detection script.
			const motionProcess = spawn('python', [
				motionScriptPath,
				'--camera', this.getLoopbackDevicePath()
			]);

			// Listen for motion events.
			motionProcess.stdout.on('data', (data) => {
				console.log(MOTION_TAG, data.toString());

				if (data && data.includes('[MOTION]')) {
					// TODO: Tell Relay motion detected.
					// socket.relay.emit('motion detected', data);
				}
				if (data && data.includes('[NO MOTION]')) {
					// TODO: Tell Relay motion stopped.
					// socket.relay.emit('motion stopped', data);
				}
			});
			motionProcess.stderr.on('data', (data) => {
				console.error(MOTION_TAG, data.toString());
			});
		}).catch((error) => {
			console.error(METHOD_TAG, error);
		});
	}

	isMotionDetectionStarted () {
		return new Promise((resolve, reject) => {
			exec('ps aux | grep -v \'log\' | grep motion.py', (error, stdout, stderr) => { // TODO: This doesn't support multiple cameras.
				if (error) {
					return reject(error);
				}
				resolve(stdout.length > 100);
			});
		});
	}

	setUpLoopback () {
		const METHOD_TAG = this.TAG + ' [check loopback]',
			oneMinute = 1000 * 60,
			intervalTimeout = oneMinute * 2;

		this.forwardStreamToLoopback();

		this.loopbackInterval = setInterval(() => {
			exec('ps aux | grep -v \'grep\' | grep ffmpeg', (error, stdout, stderr) => { // TODO: Should we be greping for a specific ffmpeg here (multiple cameras)?
				if (error) {
					this.forwardStreamToLoopback();
					return console.error(this.TAG, 'ffmpeg not running. Re-forwarding stream.');
				}
			});
		}, intervalTimeout);
	}

	forwardStreamToLoopback () {
		const METHOD_TAG = this.TAG + ' [loopback]',
			ffmpegProcess = spawn('ffmpeg', [
				'-loglevel', 'panic',
				'-f', 'v4l2',
				'-pix_fmt', 'rgb24',
				'-i', this.os_device_path,
				'-f', 'v4l2',
				this.getLoopbackDevicePath()
			]);

		ffmpegProcess.stdout.on('data', (data) => {
			console.log(METHOD_TAG, data);
		});

		ffmpegProcess.stderr.on('data', (data) => {
			console.error(METHOD_TAG, data);
		});

		ffmpegProcess.on('close', (code) => {
			console.log(METHOD_TAG, `ffmpeg exited with code ${code}.`);
		});
	}

	dbSerialize () {
		return {
			...Service.prototype.dbSerialize.apply(this, arguments),
			os_device_path: this.os_device_path
		};
	}
}

module.exports = CameraService;
