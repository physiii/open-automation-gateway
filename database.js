// -----------------------------  OPEN-AUTOMATION ------------------------- //
// ------------  https://github.com/physiii/open-automation --------------- //
// -------------------------------- database.js --------------------------- //


const connection = require('./connection.js'),
  utils = require('./utils.js'),
  mongodb = require('mongodb'),
  ObjectId = require('mongodb').ObjectID,
  MongoClient = mongodb.MongoClient,
  TAG = '[database.js]';

module.exports = {
  set_wifi_from_db,
  get_devices,
  get_settings,
  store_settings,
  store_device,
  get_camera_recordings,
  get_camera_recording,
  delete_camera_recording,
  store_zwave_node,
  get_zwave_nodes,
  settings
}

//-- initialize variables --//
var settings = {};

function connect (callback) {
  MongoClient.connect('mongodb://127.0.0.1:27017/gateway', (error, db) => {
    if (error) {
      console.error('Unable to connect to the mongoDB server. Error:', error);
      callback('Unable to connect to gateway database.');
      return;
    }

    callback(null, db);
  });
}

function set_wifi_from_db () {
  console.log("set_wifi_from_db");
  MongoClient.connect('mongodb://127.0.0.1:27017/gateway', function (err, db) {
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
      var collection = db.collection('settings');
      collection.find().toArray(function (err, result) {
        if (err) {
          console.log(err);
        } else if (result.length) {
  	  settings_obj = result[0];
  	  connection.set_wifi(settings_obj);
 	  //console.log('initialize variables | ',settings_obj);
        } else {
          console.log(TAG,'set_wifi_from_db | no results');
        }
        db.close();
      });
    }
  });
}

//-- get and send settings object --//
function get_settings () {
  return new Promise((resolve, reject) => {
    MongoClient.connect('mongodb://127.0.0.1:27017/gateway', function (error, db) {
      if (error) {
        reject(error);
        return console.log('Unable to connect to the mongoDB server. Error:', error);
      }

      var collection = db.collection('settings');
      collection.find().toArray(function (error, result) {
        if (error) {
          reject(error);
          return console.log(error);
        }

        if (result[0]) {
          settings = result[0];
        }

        module.exports.settings = settings;
        resolve(settings);
      });

      db.close();
    });
  });
}

//-- store setting --//
function store_settings (data) {
  connect(function (error, db) {
    if (error) {
      return;
    }

    settings[Object.keys(data)[0]] = data[Object.keys(data)[0]];

    db.collection('settings').update({}, {$set: data}, {upsert: true}, function (error, item) {
        //console.log("item",item)
    });

    db.close();
  });
}

//-- store new device --//
function store_device (device) {
  return new Promise((resolve, reject) => {
    connect(function (error, db) {
      if (error) {
        reject(error);
        return;
      }

      db.collection('devices').update({id: device.id}, {$set: device.dbSerialize()}, {upsert: true}, (error, record) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(record);
        }
      );

      db.close();
    });
  });
}

//-- load devices from database --//
function get_devices () {
  return new Promise((resolve, reject) => {
    MongoClient.connect('mongodb://127.0.0.1:27017/gateway', function (error, db) {
      if (error) {
        reject(error);
        return console.log(TAG, 'get_devices |', error);
      }

      const collection = db.collection('devices');

      collection.find().toArray(function (error, result) {
        if (error) {
          reject(error);
          return console.log(TAG, error);
        }

        resolve(result);
      });

      db.close();
    });
  });
}

function get_camera_recordings (camera_id) {
  return new Promise((resolve, reject) => {
    MongoClient.connect('mongodb://127.0.0.1:27017/gateway', function (error, db) {
      let query;

      if (error) {
        reject(error);
        return;
      }

      if (camera_id) {
        query = db.collection('camera_recordings').find({camera_id: camera_id});
      } else {
        query = db.collection('camera_recordings').find();
      }

      query.toArray(function (error, result) {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      });

      db.close();
    });
  });
}

function get_camera_recording (recording_id) {
  return new Promise((resolve, reject) => {
    MongoClient.connect('mongodb://127.0.0.1:27017/gateway', function (error, db) {
      if (error) {
        reject(error);
        return;
      }

      db.collection('camera_recordings').find({id: recording_id}, function (error, result) {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      });

      db.close();
    });
  });
}

function delete_camera_recording (recording_id) {
  return new Promise((resolve, reject) => {
    MongoClient.connect('mongodb://127.0.0.1:27017/gateway', function (error, db) {
      if (error) {
        reject(error);
        return;
      }

      db.collection('camera_recordings').remove({id: recording_id}, function (error, result) {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      });

      db.close();
    });
  });
}

function store_zwave_node (node) {
  delete node['_id'];
  MongoClient.connect('mongodb://127.0.0.1:27017/gateway', function (err, db) {
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
      var collection = db.collection('zwave_nodes');

      collection.update({id:node.id}, {$set:node}, {upsert:true}, function (err) {
        if (err) {
          console.error(TAG, err);
        }
      });

      db.close();
    }
  });
}

function get_zwave_nodes () {
  return new Promise((resolve, reject) => {
    MongoClient.connect('mongodb://127.0.0.1:27017/gateway', function (error, db) {
      if (error) {
        reject(error);
        return console.log(TAG, 'get_zwave_nodes |', error);
      }

      const collection = db.collection('zwave_nodes');

      collection.find().toArray(function (error, result) {
        if (error) {
          reject(error);
          return console.log(TAG, error);
        }

        resolve(result);
      });

      db.close();
    });
  });
}
