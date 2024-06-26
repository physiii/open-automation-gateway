const { MongoClient, ServerApiVersion } = require("mongodb");
const TAG = '[Database]';

var settings = {};

class Database {

	constructor() {
		this.client = new MongoClient('mongodb://127.0.0.1:27017/gateway', { 
		  useNewUrlParser: true, 
		  useUnifiedTopology: true,
		  serverApi: {
			version: ServerApiVersion.v1,
			strict: true,
			deprecationErrors: true
		  }
		});
		this.isConnected = false;
	  }
	
	async connect() {
		if (!this.isConnected) {
			try {
			await this.client.connect();
			this.isConnected = true;
			} catch (error) {
			console.error(TAG, 'Unable to connect to the mongoDB server. Error:', error);
			throw new Error('Unable to connect to gateway database.');
			}
		}
		return this.client;
	}

	async close() {
		if (this.isConnected) {
			await this.client.close();
			this.isConnected = false;
		}
	}

	async getDevices() {
		try {
			await this.connect();
			const result = await this.client.db().collection('devices').find().toArray();
			return result;
		} catch (error) {
			console.error(TAG, 'getDevices', error);
			throw new Error('Database error');
		}
	}
	
	store (collection, data) {
		return this.connect((db, resolve, reject) => {
			db.collection(collection).update({}, {$set: data}, {upsert: true}, (error, item) => {
				db.close();
				if (error) {
					reject('Database error');
					return console.error(TAG, 'store', error);
				}
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
				if (!result[0]) reject();
				resolve(result[0]);
			});
		});
	}

	getDeviceID () {
		return this.connect((db, resolve, reject) => {
			db.collection('devices').find().toArray((error, result) => {
				db.close();
				let device_id = result[1] ? result[1].id : 'Does not exist.';
				if (error) {
					console.error(TAG, 'getDeviceID', error);
					reject('Database error');
					return;
				}
				resolve(device_id);
			});
		});
	}

	getGatewayID () {
		return this.connect((db, resolve, reject) => {
			db.collection('devices').find().toArray((error, result) => {
				db.close();

				if (error) {
					console.error(TAG, 'getDeviceID', error);
					reject('Database error');
					return;
				}

				if (!result[0])	{
					reject(0);
					return console.log('No Gateway ID Found.');
				}

				if (!result[0].services[0]) resolve(0);
				resolve(result[0].services[0].id);
			});
		});
	}

	removeDevice(id) {
		this.connect((db, resolve, reject) => {
			db.collection('devices').remove({id: id});
		});
	}

	getDeviceFromServiceId (id) {
		return this.connect((db, resolve, reject) => {
			db.collection('devices').find().toArray((error, devices) => {
				db.close();
				devices.forEach(device => {
					device.services.forEach((service) => {
						if (service.id === id) {
							resolve(device);
						}
					});
				})
				if (error) {
					console.error(TAG, 'getDeviceFromServiceId', error);
					reject('Database error');
					return;
				}
			});
		});
	}

	getThermostatState (id) {
		return this.connect((db, resolve, reject) => {
			db.collection('devices').find().toArray((error, devices) => {
				db.close();
				devices.forEach(device => {
					device.services.forEach((service) => {
						if (service.id === id) {
							resolve(service.state);
						}
					});
				})
				if (error) {
					console.error(TAG, 'getThermostatState', error);
					reject('Database error');
					return;
				}
			});
		});
	}

	getThermostatSchedule (id) {
			return this.connect((db, resolve, reject) => {
				db.collection('devices').find().toArray((error, devices) => {
					db.close();
					devices.forEach(device => {
						device.services.forEach((service) => {
							if (service.id === id) {
								console.log(TAG, 'getThermostatSchedule FOUND SCHEDULE!', service);
								resolve(service.schedule);
							}
						});
					})
					if (error) {
						console.error(TAG, 'getThermostatSchedule', error);
						reject('Database error');
						return;
					}
				});
			});
	}

	setThermostatSchedule (id, schedule) {
		this.getDeviceFromServiceId(id)
		.then((device) => {
			device.services.forEach((service, i) => {
				if (service.id === id) {
					device.services[i].schedule = schedule;

					return this.connect((db, resolve, reject) => {
						delete device['_id'];
						db.collection('devices').update({}, {$set: device}, {upsert: true}, (error, item) => {
							db.close();
							if (error) {
								return console.error(TAG, 'setThermostatSchedule', error);
							}
						});
					});

				}
			});
		})
	}

	saveThermostatState (id, state) {
		this.getDeviceFromServiceId(id)
		.then((device) => {
			device.services.forEach((service, i) => {
				if (service.id === id) {
					device.services[i].state = state;

					return this.connect((db, resolve, reject) => {
						// delete device['_id'];
						db.collection('devices').update({id: device.id}, {$set: device}, {upsert: true}, (error, item) => {
							db.close();
							if (error) {
								return console.error(TAG, 'setThermostatState', error);
							}
						});
					});

				}
			});
		})
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

	async store_device(device) {
		try {
			await this.connect();
			const collection = this.client.db().collection('devices');
			const result = await collection.updateOne(
				{ id: device.id }, 
				{ $set: device.dbSerialize() }, 
				{ upsert: true }
			);
			return result;
		} catch (error) {
			throw new Error('Database error');
		}
	}

	linkLightToController (id) {
		return this.connect((db, resolve, reject) => {
			db.collection('devices').update({id}, {$set: device.dbSerialize()}, {upsert: true}, (error, record) => {
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

	async get_camera_recordings(camera_id) {
	
		try {
			await this.connect();
			let query = {};
	
			if (camera_id) {
				query = { camera_id };
			}
			const result = await this.client.db().collection('camera_recordings').find(query).toArray();
	
			return result;
		} catch (error) {
			console.error(TAG, 'get_camera_recordings', error);
			throw new Error('Database error');
		}
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

	set_camera_recording (data) {
		return this.connect((db, resolve, reject) => {
			db.collection('camera_recordings').insertOne(data, (error, record) => {
				db.close();

				if (error) {
					console.error(TAG, 'set_camera_recording', error);
					reject('Database error');
					return;
				}

				resolve(record);
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

	storeAccessLog (data) {
		return this.connect((db, resolve, reject) => {
			db.collection('access_log').insertOne(data, (error, record) => {
				db.close();

				if (error) {
					console.error(TAG, 'storeAccessLog', error);
					reject('Database error');
					return;
				}

				resolve(record);
			});
		});
	}

	getAccessLogs () {
		return this.connect((db, resolve, reject) => {
			db.collection('access_log').find().toArray((error, result) => {
				db.close();

				if (error) {
					console.error(TAG, 'getBAccessLog', error);
					reject('Database Error');
					return;
				}

				resolve(result);
			});
		});
	}

	storeSirenLog (data) {
		return this.connect((db, resolve, reject) => {
			db.collection('access_log').insertOne(data, (error, record) => {
				db.close();

				if (error) {
					console.error(TAG, 'storeAccessLog', error);
					reject('Database error');
					return;
				}

				resolve(record);
			});
		});
	}

	getSirenLogs () {
		return this.connect((db, resolve, reject) => {
			db.collection('access_log').find().toArray((error, result) => {
				db.close();

				if (error) {
					console.error(TAG, 'getBAccessLog', error);
					reject('Database Error');
					return;
				}

				resolve(result);
			});
		});
	}
}

module.exports = new Database();
