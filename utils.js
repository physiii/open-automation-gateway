// -----------------------------  OPEN-AUTOMATION ------------------------ //
// ------------  https://github.com/physiii/open-automation -------------- //
// --------------------------------- utils.js ---------------------------- //

const exec = require('child_process').exec,
	spawn = require('child_process').spawn,
	rimraf = require('rimraf'),
	TAG = '[utils.js]';

module.exports = {
	checkIfProcessIsRunning,
	removeOldCameraRecordings,
	update
};

// Accepts search strings as arguments and looks for processes that match those
// search strings.
function checkIfProcessIsRunning () {
	return new Promise((resolve, reject) => {
		let command = 'ps aux | grep -v \'grep\'';

		Array.from(arguments).forEach((search_term) => {
			command += ' | grep ' + search_term;
		});

		exec(command, (error, stdout, stderr) => {
			// If there's an error, the command found no processes.
			resolve(!Boolean(error));
		});
	});
}

function removeOldCameraRecordings() {
	return new Promise((resolve, reject) => {
		// Return only base file name without dir
		exec('find /usr/local/lib/gateway/events -type f -printf \'%T+ %p\n\' | sort | head -n 1', (error, stdout, stderr) => {
			if (error) {
				console.error(TAG, `Remove old recordings: error: ${error}`);
				reject(error);

				return;
			}

			if (!stdout) {
				console.log(TAG, 'Remove old recordings: no motion files found to remove.');
				resolve();

				return;
			}

			var temp_arr = stdout.split(' ')[1].split('/'),
				oldest_dir = '';

			temp_arr[temp_arr.length - 1] = '';

			for (var i = 0; i < temp_arr.length; i++) {
				if (temp_arr[i] === '') {
					continue;
				}

				oldest_dir += '/' + temp_arr[i];
			}

			try {
				rimraf(oldest_dir, function (error) {
					if (error) {
						console.log(TAG, 'Remove old recordings: error:', error);
						reject(error);

						return;
					}

					console.log(TAG, 'Remove old recordings: directory deleted:', oldest_dir);
					resolve(oldest_dir);
				});
			} catch (error) {
				console.log(TAG, 'Remove old recordings: error deleting files:', error);
				reject(error);
			};
		});
	});
}

function update () {
	const path = __dirname.replace('/gateway',''),
		git = spawn('git', ['-C', path, 'pull']);

	console.log('Update: pull from ', path);

	git.stdout.on('data', (data) => console.log(`Update: ${data}`));
	git.stderr.on('data', (data) => console.log(`Update: error: ${data}`));

	exec('pm2 restart gateway', (error, stdout, stderr) => {
		if (error) {
			console.error(`Update: restart gateway error: ${error}`);
			return;
		}

		console.log(stdout);
		console.log(stderr);
	});
}
