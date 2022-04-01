const
	{ execSync, spawn } = require('child_process'),
	TAG = '[LocaDisplay]',
	util = require('util'),
	utils = require('./utils.js'),
	rtspIp = '192.168.1.143',
	rtspUrl = 'rtsp://admin:Qweasdzxc1@' + rtspIp + '/stream1'

class LocalDisplay {
	constructor () {
		execSync('export DISPLAY=:0');
		// this.startDisplay();
		this.launchVlc();
	}

	// startDisplay () {
	// 	console.log(TAG, "Starting display.");
	//
	// 	exec('ping -c 1 ' + rtspIp, (err, stdout, stderr) => {
	// 		if (err) {
	// 			console.error(err, 'Can not ping camera.', rtspIp);
	// 			this.startDisplay()
	// 			return;
	// 		}
	// 		console.log(stdout, 'Can ping camera, starting VLC.');
	// 		// if (!vlcProcess) vlcProcess.kill();
	// 		setTimeout(()=>this.launchVlc(), 5000);
	// 	});
	//
	// }

	launchVlc () {
		// vlc rtsp://admin:Qweasdzxc1@192.168.1.143/stream1 --fullscreen --rtsp-frame-buffer-size 5000000
		const opts = [
				// rtspUrl,
				'rtsp://admin:Qweasdzxc1@192.168.1.143/stream1',
				'--fullscreen',
				'--rtsp-frame-buffer-size', '1000000'
			],
			vlcProcess = spawn('vlc', opts),
			errMsg = "live555 demux error";

		vlcProcess.stdout.on('data', (data) => {
			console.log(TAG, 'stdout', data.toString('utf-8'));
		});

		vlcProcess.stderr.on('data', (data) => {

			// data = data.toString('utf-8');
			if (data.includes(errMsg)) {
				console.error(TAG, 'stderr', '!! -- Killing VLC -- !!', data.toString('utf-8'));
				vlcProcess.kill();
			}

			console.log(TAG, 'stderr', data.toString('utf-8'));
		});

		vlcProcess.on('close', (code) => {
			console.log(TAG, 'close', '!! -- Starting VLC -- !!', code);
			this.launchVlc();
			// this.startDisplay();
		});

		utils.printOptions('vlc', opts);
	}
}


module.exports = new LocalDisplay();
