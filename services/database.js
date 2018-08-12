const MongoClient = require('mongodb').MongoClient,
	TAG = '[Database]';

var settings = {};

class Database {

  constructor () {
		this.init = this.init.bind(this);
	}

  init () {
		return;
	}

	connect (callback) {
	return new Promise((resolve, reject) => {
		MongoClient.connect('mongodb://127.0.0.1:27017/gateway', (error, db) => {
			if (error) {
				console.error(TAG, 'Unable to connect to the mongoDB server. Error:', error);
				reject('Unable to connect to gateway database.');
				return;
			}
			callback(db, resolve, reject);
		});
	});
	}

	store (collection, data) {
	return this.connect((db, resolve, reject) => {
		db.collection(collection).update({}, {$set: data}, {upsert: true}, (error, item) => {
			db.close();
			if (error) {
				reject('Database error');
				return console.error(TAG, 'store', error);
			}
			console.log(TAG,"store",data);
			resolve();
		});
	});
	}

	getValueByKey (collection, key) {
		return this.connect((db, resolve, reject) => {
			let query = {};
			query[key] = {$exists:true};

			db.collection(collection).find().toArray((error, result) => {
				db.close();
				if (error) reject('Database error');
				if (!result[0]) reject('key not found');
				resolve(result[0]);
			});
		});
	}

	getDeviceID () {
	return this.connect((db, resolve, reject) => {
		db.collection('settings').find().toArray((error, result) => {
			db.close();
			let device_id = result[0].main_device_id;
			if (error) {
				console.error(TAG, 'getDeviceID', error);
				reject('Database error');
				return;
			}
			resolve(device_id);
		});
	});
	}

	get_settings () {
	return this.connect((db, resolve, reject) => {
		db.collection('settings').find().toArray((error, result) => {
			db.close();

			if (error) {
				console.error(TAG, 'get_settings', error);
				reject('Database error');
				return;
			}

			if (result[0]) {
				settings = result[0];
				delete settings._id;
			}

			module.exports.settings = settings;

			resolve(settings);
		});
	});
	}

	store_settings (data) {
	return this.connect((db, resolve, reject) => {
		db.collection('settings').update({}, {$set: data}, {upsert: true}, (error, item) => {
			db.close();

			if (error) {
				console.error(TAG, 'store_settings', error);
				reject('Database error');
				return;
			}

			resolve();
		});
	});
	}

	store_device (device) {
	return this.connect((db, resolve, reject) => {
		db.collection('devices').update({id: device.id}, {$set: device.dbSerialize()}, {upsert: true}, (error, record) => {
			db.close();

			if (error) {
				console.error(TAG, 'store_device', error);
				reject('Database error');
				return;
			}

			resolve(record);
		});
	});
	}

	get_devices () {
	return this.connect((db, resolve, reject) => {
		db.collection('devices').find().toArray((error, result) => {
			db.close();

			if (error) {
				console.error(TAG, 'get_devices', error);
				reject('Database error');
				return;
			}

			resolve(result);
		});
	});
	}

	get_camera_recordings (camera_id) {
	return this.connect((db, resolve, reject) => {
		let query = {};

		if (camera_id) {
			query = {camera_id: camera_id};
		}

		db.collection('camera_recordings').find(query).toArray((error, result) => {
			db.close();

			if (error) {
				console.error(TAG, 'get_camera_recordings', error);
				reject('Database error');
				return;
			}

			resolve(result);
		});
	});
	}

	get_camera_recording (recording_id) {
	return this.connect((db, resolve, reject) => {
		db.collection('camera_recordings').find({id: recording_id}).toArray((error, result) => {
			db.close();

			if (error) {
				console.error(TAG, 'get_camera_recording', error);
				reject('Database error');
				return;
			}

			resolve(result[0]);
		});
	});
	}

	delete_camera_recording (recording_id) {
	return this.connect((db, resolve, reject) => {
		db.collection('camera_recordings').remove({id: recording_id}, (error, result) => {
			db.close();

			if (error) {
				console.error(TAG, 'delete_camera_recording', error);
				reject('Database error');
				return;
			}

			resolve(result);
		});
	});
	}

	store_zwave_node (node) {
	const node_temp = {...node};

	delete node_temp['_id'];

	return this.connect((db, resolve, reject) => {
		db.collection('zwave_nodes').update({id: node_temp.id}, {$set: node_temp}, {upsert: true}, (error) => {
			db.close();

			if (error) {
				console.error(TAG, 'store_zwave_node', error);
				reject('Database error');
				return;
			}

			resolve();
		});
	});
	}

	get_zwave_nodes () {
	return this.connect((db, resolve, reject) => {
		db.collection('zwave_nodes').find().toArray((error, result) => {
			db.close();

			if (error) {
				console.error(TAG, 'get_zwave_nodes', error);
				reject('Database error');
				return;
			}

			resolve(result);
		});
	});
	}
}

module.exports = new Database();
