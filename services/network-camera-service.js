const
	FormData = require('form-data'),
	request = require('request'),
	spawn = require('child_process').spawn,
	exec = require('child_process').exec,
	uuid = require('uuid/v4'),
	execSync = require('child_process').execSync,
	crypto = require('crypto'),
	path = require('path'),
	fs = require('fs'),
	utils = require('../utils.js'),
	Service = require('./service.js'),
	config = require('../config.json'),
	CameraApi = require('./api/camera-api.js'),
	VideoStreamer = require('../video-streamer.js'),
	CameraRecordings = require('../camera-recordings.js'),
	motionScriptPath = path.join(__dirname, '/../motion/motion.py'),
	mediaDir = "/usr/local/lib/open-automation/camera/",
	eventsDir = "/usr/local/lib/open-automation/camera/events/",
	tmpDir = "/tmp/open-automation/",
	// streamDir = "/usr/local/lib/open-automation/camera/stream/",
	streamDir = "/tmp/open-automation/camera/stream/",
	ONE_DAY_IN_HOURS = 24,
	ONE_HOUR_IN_MINUTES = 60,
	ONE_MINUTE_IN_SECONDS = 60,
	ONE_DAY_IN_MILLISECONDS = 86400000,
	ONE_HOUR_IN_MILLISECONDS = 3600000,
	ONE_MINUTE_IN_MILLISECONDS = 60000,
	ONE_SECOND_IN_MILLISECONDS = 1000,
	CHECK_SCRIPTS_DELAY = 60 * ONE_MINUTE_IN_MILLISECONDS,
	FRAME_RATE = 8,
	NO_MOTION_DURATION = 60 * ONE_SECOND_IN_MILLISECONDS,
	SERVICE_LOOP = 10 * 1000,
	TAG = '[NetworkCameraService]';

let
	currentBuffer = 0,
	ffmpegCapture = [];

class NetworkCameraService extends Service {
	constructor (data, relaySocket, save) {
		super(data, relaySocket, save, CameraApi);

		this.TAG = TAG;
		this.network_path = data.network_path || '';
		this.motionDetected = false;
		this.motionTime = { start: 0, stop: 0};
		this.currentPosition = [];
		this.watcher = null;
		this.motionDuractionMax = ONE_HOUR_IN_MILLISECONDS;
		this.isStreaming = false;
		this.streamStarted = false;
		this.postloadTimeout;
		this.cameraStreamDir = streamDir + this.id;
		this.watchStreamDir = {};
		this.info = {};

		// Settings
		this.settings.network_path = data.settings && this.network_path;
		this.settings.resolution_w = data.settings && data.settings.resolution_w || 640;
		this.settings.resolution_h = data.settings && data.settings.resolution_h || 480;
		this.settings.rotation = data.settings && data.settings.rotation || config.rotation || 0;
		this.settings.should_detect_motion = data.settings && data.settings.motion_detection_enabled || true;
		this.settings.motion_threshold = data.settings && data.settings.motion_threshold || 10;
		this.settings.should_take_timelapse = data.settings && data.settings.should_take_timelapse || true;
		this.settings.timelapse_brightness_threshold = data.settings && data.settings.timelapse_brightness_threshold || 10;
		this.settings.timelapse_interval = data.settings && data.settings.timelapse_interval || 20;
		this.settings.timelapse_on_time_hour = data.settings && data.settings.timelapse_on_time_hour || 6;
		this.settings.timelapse_on_time_minute = data.settings && data.settings.timelapse_on_time_minute || 0;
		this.settings.timelapse_off_time_hour = data.settings && data.settings.timelapse_off_time_hour || 22;
		this.settings.timelapse_off_time_minute = data.settings && data.settings.timelapse_off_time_minute || 0;
		this.settings.motionArea_x1 = data.settings && data.settings.motionArea_x1 || 0;

		CameraRecordings.getLastRecording(this.id).then((recording) => this.state.motion_detected_date = recording ? recording.date : null);

		fs.mkdir(tmpDir, { recursive: true }, (err) => {
			if (err) throw err;
		});
		fs.mkdir(eventsDir, { recursive: true }, (err) => {
			if (err) throw err;
		});

		fs.rmSync(this.cameraStreamDir, { recursive: true, force: true });
		fs.mkdirSync(this.cameraStreamDir, { recursive: true }, (err) => {
			if (err) throw err;
		});

		VideoStreamer.startNetworkStream(this.id, this.network_path);
		this.startMotionDetection();
	}

	onClientConnect (val) {
		if (!this.streamStarted) {
			// VideoStreamer.streamNetworkCamera(this.id);
			// this.streamStarted = true;
		}

		// if (val) {
		// 	VideoStreamer.startNetworkStream(this.id, this.network_path);
		// } else {
		// 	VideoStreamer.stopNetworkStream(this.id);
		// 	this.isStreaming = false;
		// }
	}

	getPreviewImage () {
		const error_message = 'There was an error retrieving the preview image.';

		return new Promise((resolve, reject) => {
			try {
				fs.readFile(mediaDir + 'events/' + this.id + '/preview.jpg', (error, file) => {
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

	capturePreviewImage () {
		const command = 'ffmpeg -i '
				+ this.network_path + ' '
				+ eventsDir + this.id
				+ '/preview.jpg -y';

			setTimeout(() => {
				exec(command);
			}, 1000);
	}

	generateStreamToken () {
		return crypto.randomBytes(128).toString('hex');
	}

	stopNetworkStream () {
		if (this.watchStreamDir[this.id]) {
			this.watchStreamDir[this.id].close();
			delete this.watchStreamDir[this.id];
		}
		console.log(TAG, "stopNetworkStream");
	}

	upload(filepath, url) {
			// if (info.file == 'playlist.m3u8') return;
			// console.log(TAG, "!! uploading !!", filepath, this.info);

	    // Create the form with your file's data appended FIRST
    	var form = new FormData();
	    form.append('file', fs.createReadStream(filepath));
	    form.append('field', JSON.stringify(this.info));

			// this.info = info;
			let self = this;
	    // Needed to set the Content-Length header value
	    form.getLength(function(err,length) {

	        var opts = {
	            headers: {
	                // 'Content-Length': length,
									// 'Content-Type': 'multipart/form-data; boundary=some_random_string_for_boundary_reasons_321',
									// 'Content-Type': 'video/mpeg'
									'Content-Type': 'video/mp2t'
	            }
	        };

	        // Create the request object
	        var r = request.post(url, opts, function(error, res, body) {
						if (error) {
							console.error(error);
						}

						if (self.motionTime.stop > 0 && self.info.file != 'playlist.m3u8') {
							self.motionTime.stop = 0;
							self.motionTime.start = 0;
						}
	        });

	        // Explicitly set the request's form property to
	        // the form you've just created (not officially supported)
	        r._form = form;
	    });
	}

	uploadCallback (error) {
		console.log(TAG, "ERROR", error);
	}

	streamNetworkCamera () {
		let fileList = [],
			url = 'http://' + RELAY_SERVER + ':' + RELAY_PORT + '/stream/upload';

    this.watchStreamDir[this.id] = fs.watch(this.cameraStreamDir, (event, file) => {
				// console.log('/hls/video', event, fileList);

				if (event === "change" && file !== "playlist.m3u8.tmp" && file.indexOf('motion') < 0) {
					// console.log("file change: ", file);
					if (fileList.indexOf(file) == -1) {
						fileList.push(file);
					}
				}

        if (event === "rename" && file === "playlist.m3u8") {
						fileList.push(file);
						fileList.forEach((file, i) => {
							let motionDuration = this.motionTime.start ? Date.now() - this.motionTime.start : 0;

							// console.log(TAG,"motionDuration:", this.id, Math.floor(motionDuration/1000));
							if (motionDuration > this.motionDuractionMax) {
								this.motionTime.stop = Date.now();
							}


							this.info = {
								cameraId: this.id,
								motionTime: this.motionTime,
								file: file
							};

							this.upload(this.cameraStreamDir + '/' + file, url);
					});

					fileList = [];
        }
    });
	}

	streamLive () {
		console.log(TAG, "streamLive", this.id);
		const stream_token = this.generateStreamToken();

		if (!this.isStreaming) {
			this.streamNetworkCamera();
			this.isStreaming = true;
		}

		return stream_token;
	}

	stopStream () {
		VideoStreamer.stop();
	}

	createMotionEventFolder(date) {
		let
			stamp = date.toISOString(),
			year = stamp.substr(0,4) + '/',
			month = stamp.substr(5,2) + '/',
			day = stamp.substr(8,2) + '/',
			eventFolder = stamp.substr(0,19).replace('T','_'),
			destDir = eventsDir + this.id + '/'
				+ year + month + day + eventFolder;

		execSync('mkdir -p ' + destDir);
		console.log(TAG, 'createMotionEventFolder', destDir);
		return destDir;
	}

	getMotionDevicePath () {
		 return this.network_path.replace('stream1', 'stream2');
	}

	startMotionDetection () {
		const METHOD_TAG = this.TAG,
			MOTION_TAG = METHOD_TAG + ' ' + this.settings.name,
			motionCommand = [
				motionScriptPath,
				'--camera', this.getMotionDevicePath(),
				'--camera-id', this.id,
				'--frame-rate', FRAME_RATE,
				'--rotation', this.settings.rotation || 0,
				'--threshold', this.settings.motion_threshold || 4,
				'--motionArea_x1', this.settings.motionArea_x1 || 0,
				'--motionArea_y1', this.settings.motionArea_y1 || 0,
				'--motionArea_x2', this.settings.motionArea_x2 || 0,
				'--motionArea_y2', this.settings.motionArea_y2 || 0,
				'--audio-device', config.motion_audio_device_path || 0,
			],
			launchMotionScript = () => {
			// Launch the motion detection script.
			// python3  /home/pi/gateway/motion/motion.py --camera /dev/video20 --camera-id e7128581-c932-496a-8ebd-ce90cde03653 --frame-rate 3  --rotation 0 --threshold 4 --audio-device hw:5,1
			const motionProcess = spawn('python3', motionCommand);

			// Listen for motion events.
			motionProcess.stdout.on('data', (data) => {
				if (!data) {
					return;
				}

				const now = new Date();

				// console.log(this.id, this.settings.name, data.toString().replace('\n',''));

				if (data.includes('[MOTION]')) {
					if (this.motionTime.start == 0)  {
						console.log(this.id, this.settings.name, data.toString().replace('\n',''));
						this.state.motion_detected_date = now;
						this.motionTime.start = Date.now();
						this.capturePreviewImage();
					}

					clearTimeout(this.postloadTimeout);
					this.relayEmit('motion-started', {date: now.toISOString()});
				} else if (data.includes('[NO MOTION]')) {
					this.postloadTimeout = setTimeout(() => {
							this.motionTime.stop = Date.now();
							this.relayEmit('motion-stopped', {date: now.toISOString()});
							console.log(this.id, this.settings.name, data.toString().replace('\n',''));
					}, NO_MOTION_DURATION);
				}
			});

			motionProcess.on('close', (code) => {
				console.error(TAG, `Motion process exited with code ${code}. Restarting.`);
				setTimeout(() => {
					this.startMotionDetection();
				}, 10 * 1000)
			});

			motionProcess.stderr.on('data', (data) => {
				console.error(MOTION_TAG, data.toString());
			});
		}

		// Check if motion is already running so we do not duplicate process
		utils.checkIfProcessIsRunning('motion.py', this.getMotionDevicePath()).then((processId) => {
			utils.killProcess(processId).then(() => {
				launchMotionScript();
			});
		});
	}

	saveNetworkVideo (motionFileList) {
		const METHOD_TAG = this.TAG + ' [saveNetworkVideo]';

		let
			stamp = this.state.motion_detected_date.toISOString(),
			year = stamp.substr(0,4) + '/',
			month = stamp.substr(5,2) + '/',
			day = stamp.substr(8,2) + '/',
			filename = stamp.substr(0,19).replace('T','_') + '.avi',
			destDir = eventsDir + this.id + '/'
				+ year + month + day,
			destPath = destDir + filename;

	}

	dbSerialize () {
		return {
			...Service.prototype.dbSerialize.apply(this, arguments),
			os_device_path: this.os_device_path,
			network_path: this.network_path
		};
	}
}

NetworkCameraService.settings_definitions = new Map([...Service.settings_definitions])
	.set('network_path', {
		type: 'string',
		label: 'Network Path',
		default_value: 'init',
		validation: {is_required: false}
	})
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
	.set('show_on_dashboard', {
		type: 'boolean',
		label: 'Show on Dashboard',
		default_value: true,
		validation: {is_required: false}
	})
	.set('should_take_timelapse', {
		type: 'boolean',
		label: 'Take Timelapse',
		default_value: true,
		validation: {is_required: false}
	})
	.set('timelapse_interval', {
		type: 'integer',
		label: 'Timelapse Interval (minutes)',
		unit_label: 'seconds',
		default_value: 20,
		validation: {
			min: 0,
			is_required: false
		}
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
	.set('timelapse_on_time_hour', {
		type: 'integer',
		label: 'Timelapse On Time (hours)',
		default_value: 6,
		validation: {
			is_required: false,
			min: 0,
			max: 23
		}
	})
	.set('timelapse_on_time_minute', {
		type: 'integer',
		label: 'Timelapse On Time (minutes)',
		default_value: 0,
		validation: {
			is_required: false,
			min: 0,
			max: 59
		}
	})
	.set('timelapse_off_time_hour', {
		type: 'integer',
		label: 'Timelapse Off Time (hours)',
		default_value: 22,
		validation: {
			is_required: false,
			min: 0,
			max: 23
		}
	})
	.set('timelapse_off_time_minute', {
		type: 'integer',
		label: 'Timelapse Off Time (minutes)',
		default_value: 0,
		validation: {
			is_required: false,
			min: 0,
			max: 59
		}
	})
	.set('motion_detection_enabled', {
		type: 'boolean',
		label: 'Motion Detection',
		default_value: true,
		validation: {
			is_required: false
		}
	})
	.set('motion_threshold', {
		type: 'integer',
		label: 'Motion Threshold',
		default_value: 10,
		validation: {
			min: 0,
			is_required: false
		}
	})
	.set('motionArea_x1', {
		type: 'decimal',
		label: 'motion area value',
		default_value: 0,
		validation: {
			is_required: false,
			min: 0,
			max: 59
		}
	})
	.set('motionArea_y1', {
		type: 'decimal',
		label: 'motion area value',
		default_value: 0,
		validation: {
			is_required: false,
			min: 0,
			max: 59
		}
	})
	.set('motionArea_x2', {
		type: 'decimal',
		label: 'motion area value',
		default_value: 0,
		validation: {
			is_required: false,
			min: 0,
			max: 59
		}
	})
	.set('motionArea_y2', {
		type: 'decimal',
		label: 'motion area value',
		default_value: 0,
		validation: {
			is_required: false,
			min: 0,
			max: 59
		}
	});

module.exports = NetworkCameraService;
