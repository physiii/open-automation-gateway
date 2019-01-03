const spawn = require('child_process').spawn,
	exec = require('child_process').exec,
	crypto = require('crypto'),
	path = require('path'),
	fs = require('fs'),
	utils = require('../utils.js'),
	cv = require('opencv4nodejs'),
	Service = require('./service.js'),
	config = require('../config.json'),
	CameraApi = require('./api/camera-api.js'),
	VideoStreamer = require('../video-streamer.js'),
	CameraRecordings = require('../camera-recordings.js'),
	motionScriptPath = path.join(__dirname, '/../motion/motion.py'),
	ONE_SECOND_IN_MILLISECONDS = 1000,
	TIME_LAPSE_INTERVAL = 60 * ONE_SECOND_IN_MILLISECONDS,
	CHECK_SCRIPTS_DELAY = 30 * ONE_SECOND_IN_MILLISECONDS,
	TAG = '[CameraService]';

class CameraService extends Service {
	constructor (data, relaySocket, save) {
		super(data, relaySocket, save, CameraApi);

		this.os_device_path = data.os_device_path || '/dev/video0';
		this.TAG = TAG + ' ' + this.getCameraNumber();

		// Settings
		this.settings.resolution_w = data.settings && data.settings.resolution_w || 640;
		this.settings.resolution_h = data.settings && data.settings.resolution_h || 480;
		this.settings.rotation = data.settings && data.settings.rotation || config.rotation || 0;
		this.settings.should_detect_motion = data.settings && data.settings.should_detect_motion || true;
		this.settings.should_take_timelapse = data.settings && data.settings.should_take_timelapse || true;
		this.settings.timelapse_brightness_threshold = data.settings && data.settings.timelapse_brightness_threshold || 10;

		CameraRecordings.getLastRecording(this.id).then((recording) => this.state.motion_detected_date = recording ? recording.date : null);

		this.setUpLoopback();

		if (this.settings.should_detect_motion) {
			this.startMotionDetection();
		}

		this.startTimeLapse();
	}

	getCameraNumber () {
		return this.os_device_path.substr(this.os_device_path.length - 1);
	}

	getLoopbackDevicePath () {
		return '/dev/video1' + this.getCameraNumber();
	}

	startTimeLapse () {
		setInterval(this.saveTimeLapseImage.bind(this), TIME_LAPSE_INTERVAL);
	}

	saveTimeLapseImage () {
		const timelapse_brightness_threshold = this.settings.timelapse_brightness_threshold,
			command = 'ffmpeg -f v4l2 -i '
			+ this.getLoopbackDevicePath() + ' -vframes 1 -s 1920x1080 /usr/local/lib/gateway/timelapse/'
			+ Date.now() + '.jpeg';

    		this.getCameraImageBrightness().then(function(brightness) {
			if (brightness > timelapse_brightness_threshold) {
				exec(command);
				console.log(TAG, 'Capturing time lapse image:', command);
			} else {
				console.log(TAG, 'Too dark for timelapse.');
			}
		});
	}

	getCameraImageBrightness () {
		const error_message = 'There was an error getting camera image brightness.';
		return new Promise((resolve, reject) => {
			try {
				const wCap = new cv.VideoCapture(this.getLoopbackDevicePath());
				let image = wCap.read();

				if (image.empty) {
					reject(error_message);
				}

    		let gray_image = image.bgrToGray();
				let brightness = (gray_image.sum()/1000000).toFixed(0);

				resolve(brightness);

			} catch (error) {
				console.error(this.TAG, error_message, error);
				reject(error_message);
			}
		});
	}

	getPreviewImage () {
		const error_message = 'There was an error retrieving the preview image.';

		return new Promise((resolve, reject) => {
			try {
				fs.readFile('/usr/local/lib/gateway/events/' + this.id + '/preview.jpg', (error, file) => {
					if (error) {
						console.error(this.TAG, error_message, error);
						reject(error_message);

						return;
					}

					resolve(file.toString('base64'));
				});
			} catch (error) {
				console.error(this.TAG, error_message, error);
				reject(error_message);
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
					if (!data) {
						return;
					}

					const now = new Date();

					console.log(MOTION_TAG, data.toString());

					if (data.includes('[MOTION]')) {
						this.state.motion_detected_date = now;

						this.relayEmit('motion-started', {date: now.toISOString()});
					} else if (data.includes('[NO MOTION]')) {
						this.relayEmit('motion-stopped', {date: now.toISOString()});
					} else if (data.includes('[NEW RECORDING]')) {
						CameraRecordings.getLastRecording(this.id).then((recording) => {
							this.getPreviewImage().then((preview_image) => {
								this.relayEmit('motion-recorded', {recording, preview_image});
							});
						});
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

CameraService.settings_definitions = new Map([...Service.settings_definitions])
	.set('resolution_w', {
		type: 'integer',
		unit_label: 'px',
		label: 'Resolution Width',
		default_value: 640,
		validation: {
			is_required: false,
			min: 0,
			max: 1920
		}
	})
	.set('resolution_h', {
		type: 'integer',
		unit_label: 'px',
		label: 'Resolution Height',
		default_value: 480,
		validation: {
			is_required: false,
			min: 0,
			max: 1080
		}
	})
	.set('rotation', {
		type: 'one-of',
		label: 'Orientation',
		value_options: [
			{
				value: 0,
				label: 'Normal'
			},
			{
				value: 180,
				label: 'Upside-Down'
			}
		],
		default_value: 0,
		validation: {is_required: false}
	})
	.set('should_detect_motion', {
		type: 'boolean',
		label: 'Record Movement',
		default_value: true,
		validation: {is_required: false}
	})
	.set('timelapse_brightness_threshold', {
		type: 'integer',
		label: 'Timelapse Brightness Threshold',
		default_value: 10,
		validation: {
			is_required: false,
			min: 0,
			max: 1000
		}
	})
	.set('should_take_timelapse', {
		type: 'boolean',
		label: 'Take Timelapse',
		default_value: true,
		validation: {is_required: false}
	});

module.exports = CameraService;
