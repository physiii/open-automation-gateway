const Service = require('./service.js'),
	Exec = require('child_process').exec,
	MediaApi = require('./api/media-api.js'),
	Database = require('./database.js'),
	LOOP_DELAY = 60,
	MOUSE_SPEED = 2.5,
	TAG = '[MediaService]';

class MediaService extends Service {
	constructor (data, relaySocket, save) {
		super(data, relaySocket, save, MediaApi);
		// this.subscribeToDriver();

		// this.loadState();
		// this.startScheduleLoop();
		this.getVolume();
		this.getMuteState();
	}

	onReady (data) {
		this.state.volumeLevel = data.volumeLevel;
		this.state.muteState = data.muteState;
		this.saveState(this.id, this.state);
	}

	getAudioOutDevice () {
		let audioDevice = config.audio_out_device || 0;
		return audioDevice;
	}

	setClickCoords (coords) {
		console.log("Setting click coordinates to", coords);
		Exec('xdotool click 1');
	}

	setCoords (coords) {
		Exec('xdotool mousemove_relative --sync -- ' + coords[0]*MOUSE_SPEED + ' ' + coords[1]*MOUSE_SPEED);
		console.log("Setting coordinates to", coords);
	}

	setVolume (level) {
		Exec('xdotool key XF86AudioRaiseVolume');
		Exec('pactl set-sink-volume ' + this.getAudioOutDevice() + ' ' + level + '%');
		this.state.volumeLevel = level;
		console.log("Set volume to", level);
	}

	getVolume () {
		Exec("pacmd list-sinks|grep -A 15 '* index'| awk '/volume: front/{ print $5 }' | sed 's/[%|,]//g'", (error, stdout, stderr) => {
		  if (error) {
		    console.error(`exec error: ${error}`);
		    return;
		  }
			this.state.volumeLevel = parseInt(stdout);
		  console.log('getVolume:', this.state.volumeLevel);
		});
	}

	getMuteState () {
		Exec("pacmd list-sinks|grep -A 15 '* index'|awk '/muted:/{ print $2 }'", (error, stdout, stderr) => {
		  if (error) {
		    console.error(`exec error: ${error}`);
		    return;
		  }
			this.state.muteState = stdout == 'yes\n' ? true : false;
		  console.log('getMuteStatus:', this.state.muteState);
		});
	}

	mute () {
		Exec('xdotool key XF86AudioMute');
		this.getMuteState();
	}

	pause () {
		Exec('xdotool key space');
	}

	prev () {
		Exec('xdotool key Left');
	}

	next () {
		Exec('xdotool key Right');
	}

	dbSerialize () {
		return {
			...Service.prototype.dbSerialize.apply(this, arguments),
			ip: this.ip
		};
	}
}

module.exports = MediaService;
