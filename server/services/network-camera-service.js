const
	{ spawn, exec, execSync } = require('child_process'),
	{ v4: uuid } = require('uuid'),
	axios = require('axios'),
	FormData = require('form-data'),
	crypto = require('crypto'),
	path = require('path'),
	fs = require('fs-extra');
	utils = require('../utils.js'),
	Service = require('./service.js'),
	config = require('../config.json'),
	CameraApi = require('./api/camera-api.js'),
	VideoStreamer = require('../video-streamer.js'),
	CameraRecordings = require('../camera-recordings.js'),
	motionScriptPath = path.join(__dirname, '/../motion/motion.py'),
	DetectMotionProgramPath = path.join(__dirname, '/../motion/DetectMotion.py'),
	mediaDir = "/usr/local/lib/open-automation/camera/",
	eventsDir = path.join(mediaDir, 'events/'),
	tmpDir = "/tmp/open-automation/",
	streamDir = path.join(tmpDir, 'camera/stream/'),
	ONE_DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000,  // 24 hours * 60 minutes * 60 seconds * 1000 milliseconds
	ONE_HOUR_IN_MILLISECONDS = 60 * 60 * 1000,  // 60 minutes * 60 seconds * 1000 milliseconds
	ONE_MINUTE_IN_MILLISECONDS = 60 * 1000,  // 60 seconds * 1000 milliseconds
	ONE_SECOND_IN_MILLISECONDS = 1000,
	CHECK_SCRIPTS_DELAY = 60 * ONE_MINUTE_IN_MILLISECONDS,
	FRAME_RATE = 8,
	NO_MOTION_DURATION = 60 * ONE_SECOND_IN_MILLISECONDS,
	SERVICE_LOOP = 10 * ONE_SECOND_IN_MILLISECONDS,
	CAMERA_RETRY_TIME = 60,
	TAG = '[NetworkCameraService]';

let
	currentBuffer = 0,
	ffmpegCapture = [];

class NetworkCameraService extends Service {
	constructor (data, relaySocket, save) {
		super(data, relaySocket, save, CameraApi);
		
		this.TAG = TAG;
		this.setupCameraDetails(data);
		this.setupCameraSettings(data.settings);
		
		this.motionDetected = false;
		this.motionTime = { start: 0, stop: 0 };
		this.currentPosition = [];
		this.watcher = null;
		this.motionDuractionMax = ONE_HOUR_IN_MILLISECONDS;
		this.isStreaming = false;
		this.streamStarted = false;
		this.postloadTimeout;
		this.cameraStreamDir = `${streamDir}${this.id}`;
		this.watchStreamDir = {};
		this.info = {};

		CameraRecordings.getLastRecording(this.id)
			.then((recording) => this.state.motion_detected_date = recording ? recording.date : null);

		this.isStreaming = true;
		this.streamNetworkCamera();
		VideoStreamer.startNetworkStream(this.id, this.network_path);
		// this.startMotionDetection();
	}

	setupCameraDetails(data) {
		this.network_path = `${data.protocol}${data.user}:${data.pwd}@${data.ip_address}:${data.port}${data.path}`;
		this.ip_address = data.ip_address || '127.0.0.1';
		this.user = data.user || 'admin';
		this.pwd = data.pwd || 'password';
		this.port = data.port || 554;
		this.protocol = data.protocol || 'rtsp://';
		this.path = data.path || '';
		this.sub_path = data.sub_path || '/stream2';
	}

	setupCameraSettings(settings) {
		this.settings = settings || {};
		let defaults = {
			network_path: this.network_path,
			resolution_w: 640,
			resolution_h: 480,
			rotation: config.rotation || 0,
			should_detect_motion: true,
			motion_threshold: 10,
			should_take_timelapse: true,
			timelapse_brightness_threshold: 10,
			timelapse_interval: 20,
			timelapse_on_time_hour: 6,
			timelapse_on_time_minute: 0,
			timelapse_off_time_hour: 22,
			timelapse_off_time_minute: 0,
			motionArea_x1: 0,
		};

		// Set the settings to the defaults if they're not already set
		for (let [key, value] of Object.entries(defaults)) {
			if (!this.settings.hasOwnProperty(key)) {
				this.settings[key] = value;
			}
		}
		console.log('Starting camera: ', this.settings.name);
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

	stopNetworkStream () {
		if (this.watchStreamDir[this.id]) {
			this.watchStreamDir[this.id].close();
			delete this.watchStreamDir[this.id];
		}
		console.log(TAG, "stopNetworkStream");
	}

	streamLive () {
		if (!this.isStreaming) {
			this.streamNetworkCamera();
			this.isStreaming = true;
		}

		console.log(TAG, "streamLive", this.settings.name, this.id);
		return crypto.randomBytes(128).toString('hex');
	}

	stopStream () {
		VideoStreamer.stop();
	}

	getMotionDevicePath () {
		let url = this.protocol
			+ this.user + ':' + this.pwd + '@'
			+ this.ip_address + ':' + this.port
			+ this.sub_path;
		// console.log(TAG, "getMotionDevicePath", url);
		return url;
	}

	async handleRenameEvent(fileList, url) {
		try {
			for (let i = 0; i < fileList.length; i++) {
				const file = fileList[i];
				const videoFilepath = path.join(this.cameraStreamDir, file);
				const now = new Date();
				let info = this.getFileInfo(file);
				let motionDuration = this.motionTime.start ? Date.now() - this.motionTime.start : 0;
	
				if (motionDuration > this.motionDuractionMax) {
					this.motionTime.stop = Date.now();
					clearTimeout(this.postloadTimeout);
					this.isNoMotionTimeoutSet = false;
					console.log(`Hit max recoring time of ${this.motionDuractionMax}. Stopping recording.`);
				}
	
				if (info.file !== 'playlist.m3u8') {
					let motionFrames = await this.detectMotionInClip(videoFilepath, info);
					// let audioFrames = await this.detectAudioInClip(videoFilepath, info);
					if (motionFrames > 4) {
						this.handleMotionDetected(now);
						console.log(TAG, this.id, this.settings.name, "motion detected [" + this.settings.motion_threshold + "] for " + motionFrames + " frames");
					} else {
						if (this.motionTime.start !== 0) {
							this.handleNoMotionDetected(now);
						}
					}
				}

				info.motionTime.start = this.motionTime.start;
				info.motionTime.stop = this.motionTime.stop;
				info = await this.upload(videoFilepath, url, info);

				if (info.body.info.motionTime.start > 0 && info.body.info.motionTime.stop > 0) {
					console.log(TAG, this.id, this.settings.name, 
						"motion stopped at", 
						(info.body.info.motionTime.stop - info.body.info.motionTime.start) / 1000);
					this.motionTime.stop = 0;
					this.motionTime.start = 0;
					clearTimeout(this.postloadTimeout);
					this.isNoMotionTimeoutSet = false;
				}
			}
		} catch (error) {
			console.error(error);
		}
	}
	
	detectMotionInClip(clipPath) {
		const cmd = `python3 ${DetectMotionProgramPath} --video "${clipPath}" --threshold ${this.settings.motion_threshold} --contour 60`;
		try {
			const res = execSync(cmd, { encoding: 'utf8' });
			const resultJson = JSON.parse(res);
			return resultJson.motion_frames;
		} catch (error) {
			console.error('Error executing the Python script:', error);
			return null;
		}
	}
	  
	handleMotionDetected(now) {
		this.relayEmit('motion-started', {date: now.toISOString()});
		clearTimeout(this.postloadTimeout);
		this.postloadTimeout = null; // do we need this?
		this.isNoMotionTimeoutSet = false;
	
		if (this.motionTime.start === 0) {
			this.state.motion_detected_date = now;
			this.motionTime.start = Date.now();
			this.capturePreviewImage();
		}
	}
	
	handleNoMotionDetected(now) {
		if(!this.postloadTimeout) {
			this.postloadTimeout = setTimeout(() => {
				this.motionTime.stop = Date.now();
				this.relayEmit('motion-stopped', {date: now.toISOString()});
				this.postloadTimeout = undefined;
			}, NO_MOTION_DURATION);
		}
	}
	
	
	handleMotionProcessErrors(motionProcess) {
		const METHOD_TAG = this.TAG + ' [handleMotionProcessErrors]';

		motionProcess.stderr.on('data', data => {
			console.error(METHOD_TAG, data.toString());
		});
	
		motionProcess.on('close', code => {
			console.error(TAG, `Motion process exited with code ${code}. Restarting.`);
			setTimeout(this.startMotionDetection.bind(this), CAMERA_RETRY_TIME * 1000);
		});
	}
	  	
	async upload(filepath, url, info) {
		try {
		  const form = new FormData();
		  form.append('file', fs.createReadStream(filepath));
		  form.append('field', JSON.stringify(info));
	  
		  const headers = form.getHeaders();
		  const axiosConfig = {
			headers,
			maxBodyLength: Infinity
		  };

		  const response = await axios.post(url, form, axiosConfig);
		  info.body = response.data;
		  return info;
		} catch (error) {
		  // Remove the file if the upload fails
		  fs.unlinkSync(filepath);
		  console.error(error);
		  throw error;
		}
	  }  

	streamNetworkCamera() {
		const url = `http://${RELAY_SERVER}:${RELAY_PORT}/stream/upload`;
		let fileList = [];

		if (fs.existsSync(this.cameraStreamDir)) {
			fs.rmSync(this.cameraStreamDir, { recursive: true, force: true });
		}

		execSync(`mkdir -p ${this.cameraStreamDir}`);

		this.watchStreamDir[this.id] = fs.watch(this.cameraStreamDir, (event, file) => {
			const isChangeEvent = event === "change";
			const isNotTempPlaylist = file !== "playlist.m3u8.tmp";
			const isNotMotionFile = file.indexOf('motion') < 0;
			const isRenameEvent = event === "rename";
			const isPlaylist = file === "playlist.m3u8";

			if (isChangeEvent && isNotTempPlaylist && isNotMotionFile) {
				if (fileList.indexOf(file) === -1) {
					fileList.push(file);
				}
			}

			if (isRenameEvent && isPlaylist) {
				fileList.push(file); // Append the file to the file list
				this.handleRenameEvent(fileList, url);
				fileList = []; // Clear the file list after handling the rename event
			}
		});
	}
		
	getFileInfo(file) {		
		return {
			cameraId: this.id,
			motionTime: this.motionTime,
			file: file
		};
	}

	startMotionDetection() {
		const METHOD_TAG = `${this.TAG} ${this.settings.name}`;
	
		const launchMotionScript = () => {
			const motionCommand = this.getMotionCommand();
			const motionProcess = spawn('python3', motionCommand);
			this.handleMotionEvents(motionProcess);
			this.handleMotionProcessErrors(motionProcess);
		}
	
		utils.checkIfProcessIsRunning('motion.py', this.getMotionDevicePath())
			.then(processId => utils.killProcess(processId))
			.then(launchMotionScript);
	}
	
	getMotionCommand() {
		const defaults = {
			'--rotation': 0,
			'--threshold': 4,
			'--motionArea_x1': 0,
			'--motionArea_y1': 0,
			'--motionArea_x2': 0,
			'--motionArea_y2': 0,
			'--audio-device': 0,
		};
	
		const motionCommand = [
			motionScriptPath,
			'--camera', this.getMotionDevicePath(),
			'--camera-id', this.id,
			'--frame-rate', FRAME_RATE,
		];
	
		Object.keys(defaults).forEach((key) => {
			const value = this.settings[key] || defaults[key];
			motionCommand.push(key, value);
		});
	
		return motionCommand;
	}

	dbSerialize () {
		return {
			...Service.prototype.dbSerialize.apply(this, arguments),
			os_device_path: this.os_device_path,
			network_path: this.network_path,
			user: this.user,
			pwd: this.pwd,
			ip_address: this.ip_address,
			protocol: this.protocol,
			port: this.port,
			path: this.path,
			sub_path: this.sub_path
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
