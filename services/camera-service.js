const spawn = require('child_process').spawn,
	exec = require('child_process').exec,
	crypto = require('crypto'),
	path = require('path'),
	fs = require('fs'),
	utils = require('../utils.js'),
	Service = require('./service.js'),
	VideoStreamer = require('../video-streamer.js'),
	CameraRecordings = require('../camera-recordings.js'),
	motionScriptPath = path.join(__dirname, '/../motion/motion.py'),
	ONE_SECOND_IN_MILLISECONDS = 1000,
	CHECK_SCRIPTS_DELAY = 30 * ONE_SECOND_IN_MILLISECONDS,
	TAG = '[CameraService]';

class CameraService extends Service {
	constructor (data) {
		super(data);

		this.os_device_path = data.os_device_path || '/dev/video0';
		this.TAG = TAG + ' ' + this.getCameraNumber();

		// Settings
		this.settings.resolution_w = data.settings && data.settings.resolution_w || 640;
		this.settings.resolution_h = data.settings && data.settings.resolution_h || 480;
		this.settings.rotation = data.settings && data.settings.rotation || 0;
		this.settings.should_detect_motion = data.settings && data.settings.should_detect_motion || true;

		CameraRecordings.getLastRecordingDate(this.id).then((date) => {
			this.state.last_recording_date = date;
		});

		this.getPreviewImage();
		this.setUpLoopback();

		if (this.settings.should_detect_motion) {
			this.startMotionDetection();
		}
	}

	getCameraNumber () {
		return this.os_device_path.substr(this.os_device_path.length - 1);
	}

	getLoopbackDevicePath () {
		return '/dev/video1' + this.getCameraNumber();
	}

	getPreviewImage () {
		return new Promise((resolve, reject) => {
			const handleError = () => {
				// Preview image wasn't found.
				this.state.preview_image = null;

				resolve(false);
			}

			try {
				fs.readFile('/usr/local/lib/gateway/events/' + this.id + '/preview.jpg', (error, file) => {
					if (error) {
						handleError(error);
						return;
					}

					const image = file.toString('base64');

					this.state.preview_image = image;

					resolve(image);
				});
			} catch (error) {
				handleError(error);
			}
		});
	}

	generateStreamToken () {
		return crypto.randomBytes(128).toString('hex');
	}

	streamLive () {
		const stream_token = this.generateStreamToken();

		VideoStreamer.streamLive(
			this.id,
			stream_token,
			this.getLoopbackDevicePath(),
			{
				width: this.settings.resolution_w,
				height: this.settings.resolution_h,
				rotation: this.settings.rotation
			}
		);

		return stream_token;
	}

	stopStream () {
		VideoStreamer.stop(this.id);
	}

	startMotionDetection () {
		const METHOD_TAG = this.TAG + ' [motion]',
			MOTION_TAG = METHOD_TAG + ' [motion.py]',
			launchMotionScript = () => {
				console.log(METHOD_TAG, 'Starting motion detection.');

				// Launch the motion detection script.
				const motionProcess = spawn('python', [
					motionScriptPath,
					'--camera', this.getLoopbackDevicePath(),
					'--camera-id', this.id,
					'--rotation', this.settings.rotation || 0
				]);

				// Listen for motion events.
				motionProcess.stdout.on('data', (data) => {
					console.log(MOTION_TAG, data.toString());

					if (data && data.includes('[MOTION]')) {
						this.getPreviewImage();
						this.state.last_recording_date = new Date();
						// TODO: Tell Relay motion detected.
						// socket.relay.emit('motion detected', data);
					}
					if (data && data.includes('[NO MOTION]')) {
						// TODO: Tell Relay motion stopped.
						// socket.relay.emit('motion stopped', data);
					}
					if (data && data.includes('[NEW RECORDING]')) {
						// TODO: Tell Relay there's a new recording.
					}
				});

				motionProcess.stderr.on('data', (data) => {
					console.error(MOTION_TAG, data.toString());
				});
			};

		utils.checkIfProcessIsRunning('motion.py', this.getLoopbackDevicePath()).then((isMotionRunning) => {
			if (isMotionRunning) {
				console.log(METHOD_TAG, 'Motion detection already started.');
				return;
			}

			launchMotionScript();

			// Every so often check to make sure motion detection is still running.
			this.motionScriptInterval = setInterval(() => {
				utils.checkIfProcessIsRunning('motion.py', this.getLoopbackDevicePath()).then((isMotionRunning) => {
					if (!isMotionRunning) {
						launchMotionScript();
					}
				});
			}, CHECK_SCRIPTS_DELAY);
		}).catch((error) => {
			console.error(METHOD_TAG, error);
		});
	}

	setUpLoopback () {
		const METHOD_TAG = this.TAG + ' [loopback]',
			forwardStreamToLoopback = () => {
				const ffmpegProcess = spawn('ffmpeg', [
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
					console.log(METHOD_TAG, `FFmpeg exited with code ${code}.`);
				});
			};

		forwardStreamToLoopback();

		// Every so often, check to make sure video loopback forwarding is still running.
		this.loopbackInterval = setInterval(() => {
			utils.checkIfProcessIsRunning('ffmpeg', this.os_device_path, this.getLoopbackDevicePath()).then((isLoopbackRunning) => {
				if (!isLoopbackRunning) {
					console.log(METHOD_TAG, 'FFmpeg not running. Re-forwarding stream.');

					forwardStreamToLoopback();
				}
			});
		}, CHECK_SCRIPTS_DELAY);
	}

	dbSerialize () {
		return {
			...Service.prototype.dbSerialize.apply(this, arguments),
			os_device_path: this.os_device_path
		};
	}
}

module.exports = CameraService;
