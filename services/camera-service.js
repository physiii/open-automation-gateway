const spawn = require('child_process').spawn,
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
	ONE_DAY_IN_HOURS = 24,
	ONE_HOUR_IN_MINUTES = 60,
	ONE_MINUTE_IN_SECONDS = 60,
	ONE_DAY_IN_MILLISECONDS = 86400000,
	ONE_HOUR_IN_MILLISECONDS = 3600000,
	ONE_MINUTE_IN_MILLISECONDS = 60000,
	ONE_SECOND_IN_MILLISECONDS = 1000,
	CHECK_SCRIPTS_DELAY = 60 * ONE_MINUTE_IN_MILLISECONDS,
	FRAME_RATE = config.motion_frame_rate || 3,
	BUFFER_DURATION = 5 * ONE_MINUTE_IN_MILLISECONDS,
	PRELOAD_DURATION = 10 * ONE_SECOND_IN_MILLISECONDS,
	POSTLOAD_DURATION = PRELOAD_DURATION,
	NO_MOTION_DURATION = 60 * ONE_SECOND_IN_MILLISECONDS,
	SERVICE_LOOP = 10 * 1000,
	AUDIO_LOOPBACK_DEVICE = 'hw:4,1',
	TAG = '[CameraService]';

let currentBuffer = 0,
	ffmpegCapture = [];

class CameraService extends Service {
	constructor (data, relaySocket, save) {
		super(data, relaySocket, save, CameraApi);

		this.os_device_path = data.os_device_path || '/dev/video0';
		this.TAG = TAG;
		this.loopbackStarted = false;
		this.motionDetected = false;
		this.motionTimestamp = 0;
		this.noMotionTimestamp = 0;
		this.currentPosition = [];
		this.isRecording = false;
		this.recordingBuffer = 0;
		this.postloadTimeout;

		// Settings
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

		this.setUpLoopback();
		// if (!config.disable_audio) {
			this.setUpAudioLoopback();
		// } else {
		// 	console.log(TAG, "Camera audio is disabled.");
		// }

		this.startTimeLapse();
		this.startBackup();
		this.checkDeviceFreq();
		this.checkDeviceTemp();
		this.checkUptime();

		fs.mkdir(tmpDir, { recursive: true }, (err) => {
			if (err) throw err;
		});
		fs.mkdir(eventsDir, { recursive: true }, (err) => {
			if (err) throw err;
		});
	}

	startBackup () {
		this.loopbackInterval = setInterval(() => {
			utils.checkIfProcessIsRunning('rsync').then((isRunning) => {
				if (!isRunning) {
					const source_dir = config.source_dir + this.id + "/",
						command = 'rsync -avz -e "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" --progress '
							+ source_dir + ' ' + config.user + '@' + config.server + ':' + config.dest_dir;

					exec(command);
					console.log(command);
				}
			});
		}, CHECK_SCRIPTS_DELAY);
	}

	checkDeviceFreq () {
		setInterval(() => {
			exec('vcgencmd measure_clock arm', (error, stdout, stderr) => {
				stdout = stdout.substring(stdout.indexOf("=") + 1, stdout.length - 1);
				if (this.state.deviceFreq != stdout) this.state.deviceFreq = stdout;
			});
		}, SERVICE_LOOP);
	}

	checkDeviceTemp () {
		setInterval(() => {
			exec('vcgencmd measure_temp', (error, stdout, stderr) => {
				stdout = stdout.substring(stdout.indexOf("=") + 1, stdout.length - 1);
				if (this.state.deviceTemp != stdout) this.state.deviceTemp = stdout;
			});
		}, SERVICE_LOOP);
	}

	checkUptime () {
		setInterval(() => {
			exec("awk '{printf(\"%d:%02d:%02d:%02d\",($1/60/60/24),($1/60/60%24),($1/60%60),($1%60))}' /proc/uptime", (error, stdout, stderr) => {
				if (this.state.deviceUpTime != stdout) this.state.deviceUpTime = stdout;
			});
		}, SERVICE_LOOP);
	}

	getCameraNumber () {
		return this.os_device_path.substr(this.os_device_path.length - 1);
	}

	getLoopbackDevicePath () {
		return '/dev/video2' + this.getCameraNumber();
	}

	startTimeLapse () {
		setInterval(this.saveTimeLapseImage.bind(this),
			this.settings.timelapse_interval * ONE_MINUTE_IN_MILLISECONDS);
	}

	saveTimeLapseImage () {
		const timelapse_brightness_threshold = this.settings.timelapse_brightness_threshold,
			date = new Date(Date.now()),
			tzoffset = (new Date()).getTimezoneOffset() * 60000,
			timestamp_filename = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1),
			command = 'ffmpeg -input_format yuyv422 -i '
				 + this.getLoopbackDevicePath()
				// + '/dev/video0 '
				+ ' -vf "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf: text='
				+ "'%{localtime}'"+': x=(w-tw)/100: y=h-(2*lh): fontcolor=green: box=1: boxcolor=0x00000000@1: fontsize=30"'
				+ ' -vframes 1 -s 1920x1080 '
				+ mediaDir + 'timelapse/'
				+ timestamp_filename + '.jpeg',
			on_time = this.settings.timelapse_on_time_hour * ONE_HOUR_IN_MILLISECONDS
				+ this.settings.timelapse_on_time_minute * ONE_MINUTE_IN_MILLISECONDS,
			off_time = this.settings.timelapse_off_time_hour * ONE_HOUR_IN_MILLISECONDS
				+ this.settings.timelapse_off_time_minute * ONE_MINUTE_IN_MILLISECONDS;


		let time = date.getHours() * ONE_HOUR_IN_MILLISECONDS
			+ date.getMinutes() * ONE_MINUTE_IN_MILLISECONDS
			// - date.getTimezoneOffset() * ONE_MINUTE_IN_MILLISECONDS;

		if (time > on_time && time < off_time) {
			exec(command);
			console.log(TAG, 'Capturing time lapse image:', command);
			console.log(TAG, 'Currently '+time+', timelapse window is from '+on_time+' to '+off_time);
		} else {
			console.log(TAG, 'Current time ('+time+') is outside timelapse window ('+on_time+' to '+off_time+')');
		}

		/*this.getCameraImageBrightness().then(function(brightness) {
			if (brightness > timelapse_brightness_threshold) {
				exec(command);
				console.log(TAG, 'Capturing time lapse image:', command);
			} else {
				console.log(TAG, 'Too dark for timelapse.');
			}
		});*/
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
		VideoStreamer.stop();
	}

	streamLiveAudio () {
		if (config.disable_audio) return console.log(TAG, "Camera audio is disabled.");

		const stream_token = this.generateStreamToken();

		VideoStreamer.streamLiveAudio(
			this.id,
			stream_token,
			config.stream_audio_device_path
		);

		return stream_token;
	}

	audioStreamStop () {
		VideoStreamer.stop();
	}

	startMotionDetection () {
		const METHOD_TAG = this.TAG + ' [startMotionDetection]',
			MOTION_TAG = METHOD_TAG + ' [motion.py]',
			motionCommand = [
				motionScriptPath,
				'--camera', this.getLoopbackDevicePath(),
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

			// this.startCapture();

			// Listen for motion events.
			motionProcess.stdout.on('data', (data) => {
				if (!data) {
					return;
				}

				const now = new Date();

				console.log(MOTION_TAG, data.toString());

				if (data.includes('[MOTION]')) {
					if (!this.motionDetected)  {
						this.state.motion_detected_date = now;
						this.motionDetected = true;
						this.motionTimestamp = this.currentPosition[currentBuffer];
						this.isRecording = true;
						this.recordingBuffer = currentBuffer;
					}

					console.log(METHOD_TAG, "Motion detected so clearing motionCaptureInterval and postloadTimeout.");
					if (ffmpegCapture[currentBuffer ? 0 : 1]) ffmpegCapture[currentBuffer ? 0 : 1].kill();

					clearTimeout(this.postloadTimeout);
					clearInterval(this.motionCaptureInterval);

					this.relayEmit('motion-started', {date: now.toISOString()});
				} else if (data.includes('[NO MOTION]')) {
					console.log(METHOD_TAG, "Motion has stopped so finishing postload on recording and starting preload on capture.");
					this.noMotionTimestamp = this.currentPosition[currentBuffer];
					this.fillBuffer(currentBuffer ? 0 : 1);

					this.postloadTimeout = setTimeout(() => {
						console.log(METHOD_TAG, "Finished postload on recording and preload on capture so killing recording process.");

						this.motionDuration = this.currentPosition[currentBuffer] - this.motionTimestamp;
						if (ffmpegCapture[currentBuffer]) ffmpegCapture[currentBuffer].kill();

						currentBuffer = currentBuffer ? 0 : 1;
						this.startCapture();
						this.motionDetected = false;
						this.relayEmit('motion-stopped', {date: now.toISOString()});
					}, NO_MOTION_DURATION);
				}
			});

			motionProcess.on('close', (code) => {
				console.error(TAG, `Motion process exited with code ${code}.`);
			});

			motionProcess.stderr.on('data', (data) => {
				console.error(MOTION_TAG, data.toString());
			});
			// Every so often check to make sure motion detection is still running.
			this.motionScriptInterval = setInterval(() => {
				utils.checkIfProcessIsRunning('motion.py', this.getLoopbackDevicePath()).then((isMotionRunning) => {
					if (!isMotionRunning) {
						launchMotionScript();
					}
				});
			}, CHECK_SCRIPTS_DELAY);
		}

		// Check if motion is already running so we do not duplicate process
		utils.checkIfProcessIsRunning('motion.py', this.getLoopbackDevicePath()).then((processId) => {
			utils.killProcess(processId).then(() => {
				launchMotionScript();
			});
		});
	}

	startCapture () {
		let METHOD_TAG = this.TAG + ' [capture]';
		this.motionCaptureInterval = setInterval(() => {

			console.log(METHOD_TAG, "startCapture motionCaptureInterval");

			this.fillBuffer(currentBuffer ? 0 : 1);
				setTimeout(() => {
					console.log(METHOD_TAG, "killing ffmpegCapture then switching to buffer", currentBuffer);
					if (ffmpegCapture[currentBuffer]) {
						ffmpegCapture[currentBuffer].kill();
						if (!this.isRecording) fs.unlinkSync(tmpDir + 'capBuffer' + currentBuffer + '.avi');
					}
					currentBuffer = currentBuffer ? 0 : 1;
				}, PRELOAD_DURATION);
		}, BUFFER_DURATION);
	}

	fillBuffer (num) {
		let METHOD_TAG = this.TAG + ' [fillBuffer ' + num + ']';
		// ffmpeg -f alsa -ar 44100 -i hw:1,0 -f mpegts -codec:a mp2 -f v4l2 -s 1280x720 -i /dev/video20 -s 1280x720 -q:v 4 -async 1 test.avi -y

		let options = [
				// '-loglevel', 'panic',
				'-f', 'alsa',
				'-ar', '44100',
				'-i', num ? 'hw:4,1' : 'hw:5,1',
				'-f', 'mpegts',
				'-codec:a', 'mp2',
				'-f', 'v4l2',
				'-s', this.settings.resolution_w+'x'+this.settings.resolution_h,
				'-i', this.getLoopbackDevicePath(),
				'-s', this.settings.resolution_w+'x'+this.settings.resolution_h,
				'-q:v', '4',
				'-async', '1',
				tmpDir + 'capBuffer' + num + '.avi', '-y'
			];

		VideoStreamer.printFFmpegOptions(options);
		ffmpegCapture[num] = spawn('ffmpeg', options);

		ffmpegCapture[num].stdout.on('data', (data) => {
			console.log(METHOD_TAG, 'stdout', data);
		});

		ffmpegCapture[num].stderr.on('data', (data) => {
			let match = "time=";

			// if (num != currentBuffer) return;
			data = data.toString('utf-8');
			let index = data.indexOf(match);
			if (index < 0) return;

			let arr = data.substr(index + match.length, 8).split(':');
			this.currentPosition[num] = parseInt(
				arr[0]) * ONE_HOUR_IN_MINUTES * ONE_MINUTE_IN_SECONDS
				+ parseInt(arr[1]) * ONE_MINUTE_IN_SECONDS
				+ parseInt(arr[2]);
			// console.log(METHOD_TAG, "currentPosition", currentBuffer, this.currentPosition[num]);
		});

		ffmpegCapture[num].on('close', (code) => {
			// console.log(METHOD_TAG, 'close', `FFmpeg exited with code ${code}.`);
			console.log(METHOD_TAG, "ffmpegCapture closed.", num);
			if (this.isRecording && this.recordingBuffer == num) {
				console.log(METHOD_TAG, "Saving video.");
				this.saveVideo(num);
			}
		});
	}

	saveVideo (num) {
		const METHOD_TAG = this.TAG + ' [saveVideo]';

		let src = tmpDir + 'capBuffer' + num + '.avi',
			stamp = this.state.motion_detected_date.toISOString(),
			year = stamp.substr(0,4) + '/',
			month = stamp.substr(5,2) + '/',
			day = stamp.substr(8,2) + '/',
			filename = stamp.substr(0,19).replace('T','_') + '.avi',
			destDir = eventsDir + this.id + '/'
				+ year + month + day,
			destPath = destDir + filename,
			startPos = this.motionTimestamp - PRELOAD_DURATION / ONE_SECOND_IN_MILLISECONDS,
			stopPos = this.noMotionTimestamp + POSTLOAD_DURATION / ONE_SECOND_IN_MILLISECONDS,
			start = Math.floor(startPos / (ONE_HOUR_IN_MINUTES * ONE_MINUTE_IN_SECONDS))
				+ ':' + Math.floor(startPos % (ONE_HOUR_IN_MINUTES * ONE_MINUTE_IN_SECONDS) / ONE_MINUTE_IN_SECONDS)
				+ ':' + Math.floor(startPos % (ONE_HOUR_IN_MINUTES * ONE_MINUTE_IN_SECONDS) % ONE_MINUTE_IN_SECONDS),
			stop = Math.floor(stopPos / (ONE_HOUR_IN_MINUTES * ONE_MINUTE_IN_SECONDS))
				+ ':' + Math.floor(stopPos % (ONE_HOUR_IN_MINUTES * ONE_MINUTE_IN_SECONDS) / ONE_MINUTE_IN_SECONDS)
				+ ':' + Math.floor(stopPos % (ONE_HOUR_IN_MINUTES * ONE_MINUTE_IN_SECONDS) % ONE_MINUTE_IN_SECONDS);

		console.log(METHOD_TAG, "cut:", start, stop);

		const options = [
				// '-loglevel', 'panic',
				'-i', src,
				'-ss', start,
				'-to', stop,
				'-c', 'copy',
				destPath, '-y'
			];

		VideoStreamer.printFFmpegOptions(options);
		execSync('mkdir -p ' + destDir);
		let ffmpegRecording = spawn('ffmpeg', options);

		ffmpegRecording.stdout.on('data', (data) => {
			// console.log(METHOD_TAG, 'stdout', data);
		});

		ffmpegRecording.stderr.on('data', (data) => {
			// console.log(METHOD_TAG, "stderr");
		});

		ffmpegRecording.on('close', (code) => {
			let recordingInfo = {
				id: uuid(),
				camera_id: this.id,
				file: destPath,
				date: this.state.motion_detected_date,
				duration: this.motionDuration,
				width: this.settings.resolution_w,
				height: this.settings.resolution_h
			}

			console.log(METHOD_TAG, "Saved video, adding to database:", recordingInfo);
			CameraRecordings.saveRecording(recordingInfo);
			this.isRecording = false;
		});
	}

	setUpLoopback () {
		const METHOD_TAG = this.TAG + ' [loopback]',
			forwardStreamToLoopback = () => {
				// ffmpeg -f v4l2 -input_format mjpeg -framerate 30 -video_size 1280x720 -i /dev/video0 -pix_fmt yuyv422 -f v4l2 /dev/video20
				const ffmpegProcess = spawn('ffmpeg', [
						// '-loglevel', 'panic',
						'-f', 'v4l2',
						'-input_format', 'mjpeg',
						'-framerate', '30',
						'-video_size', this.settings.resolution_w+'x'+this.settings.resolution_h,
						'-i', this.os_device_path,
						'-vf', 'format=yuv420p',
						// '-pix_fmt', 'yuyv422',
						'-f', 'v4l2',
						this.getLoopbackDevicePath()
					]);

				ffmpegProcess.stdout.on('data', (data) => {
					console.log(METHOD_TAG, data);
				});

				ffmpegProcess.stderr.on('data', (data) => {
					if (!this.loopbackStarted) {
						setTimeout(() => { // Need to wait for audio forwarding
							if (this.settings.motion_detection_enabled) {

								this.startCapture();

								this.fillBuffer(currentBuffer);

								setTimeout(() => {
									console.log(METHOD_TAG, "Initial preload finished, starting motion dection");
									this.startMotionDetection();
								}, PRELOAD_DURATION);

							} else {
								console.log(TAG, "Motion detection is disabled.");
							}
						}, ONE_SECOND_IN_MILLISECONDS);
	    			this.loopbackStarted = true;
					}
					// console.error(METHOD_TAG, 'stderr', data.toString('utf-8'));
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

	setUpAudioLoopback () {
		return new Promise((resolve, reject) => {
			// ffmpeg -f alsa -i hw:2 -f alsa -ar 44100 hw:Loopback -f alsa -ar 44100 hw:Loopback_1
			const METHOD_TAG = this.TAG + ' [Audio Loopback]',
				forwardStreamToLoopback = () => {

					let options = [
						'-loglevel', 'panic',
						'-f', 'alsa',
							'-i', config.audio_device_path,
						'-f', 'alsa',
							'hw:Loopback',
						'-f', 'alsa',
							'hw:Loopback_1',
						'-f', 'alsa',
							'hw:Loopback_2'
					];

					VideoStreamer.printFFmpegOptions(options);

					const ffmpegProcess = spawn('ffmpeg', options);

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
			resolve();
		});
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


module.exports = CameraService;
