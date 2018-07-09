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
	onChange,
	flattenArray,
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
			// \S* matches process owner, \s* matches whitespace before pid, [0-9]* matches pid
			const process_id = error ? false : /^\S*\s*([0-9]*)/g.exec(stdout)[1];

			resolve(process_id);
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

function onChange (object, onChange) {
	const handler = {
		get (target, property, receiver) {
			let value = target[property];

			const tag = Object.prototype.toString.call(value),
				shouldBindProperty = (property !== 'constructor') && (
					tag === '[object Function]' ||
					tag === '[object AsyncFunction]' ||
					tag === '[object GeneratorFunction]'
				);

			if (shouldBindProperty) {
				value = value.bind(target);
			}

			try {
				return new Proxy(value, handler);
			} catch (err) {
				return Reflect.get(target, property, receiver);
			}
		},
		defineProperty (target, property, descriptor) {
			const result = Reflect.defineProperty(target, property, descriptor);
			onChange();
			return result;
		},
		deleteProperty (target, property) {
			const result = Reflect.deleteProperty(target, property);
			onChange();
			return result;
		}
	};

	return new Proxy(object, handler);
}

function flattenArray (array_to_flatten) {
	return [].concat(...array_to_flatten);
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
