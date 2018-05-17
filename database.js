// -----------------------------  OPEN-AUTOMATION ------------------------- //
// ------------  https://github.com/physiii/open-automation --------------- //
// -------------------------------- database.js --------------------------- //


var connection = require('./connection.js');
var utils = require('./utils.js');
var mongodb = require('mongodb');
var ObjectId = require('mongodb').ObjectID;
var MongoClient = mongodb.MongoClient;

module.exports = {
  got_token: false,
  set_wifi_from_db: set_wifi_from_db,
  get_devices: get_devices,
  get_settings: get_settings,
  store_settings: store_settings,
  store_device_settings: store_device_settings,
  store_device: store_device,
  settings, settings,
  device_settings, device_settings
}

get_device_settings();

var TAG = "[database.js]";
//-- initialize variables --//
var settings = {};
var device_settings = {};

function set_wifi_from_db() {
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
function get_settings() {
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

        if (!module.exports.got_token) {
          console.log("fetching token");
          store_settings(settings);
        }

        settings.devices = device_array;
        resolve(settings);
      });

      db.close();
    });
  });
}

//-- get and send settings object --//
function get_device_settings() {
  MongoClient.connect('mongodb://127.0.0.1:27017/gateway', function (err, db) {
    if (err) return console.log('Unable to connect to the mongoDB server. Error:', err);
    var collection = db.collection('devices');
    collection.find().toArray(function (err, result) {
      if (err) return console.log(err);
      if (result[0]) device_settings = result[0]
      module.exports.device_settings = device_settings;
      //console.log("get_device_settings",device_settings);
    });
  db.close();
});
}

//-- store setting --//
function store_settings(data) {
  MongoClient.connect('mongodb://127.0.0.1:27017/gateway', function (err, db) {
    if (err) return console.log(err);
    var collection = db.collection('settings');
    settings[Object.keys(data)[0]] = data[Object.keys(data)[0]];
   //console.log('store_settings',settings);
    collection.update({}, {$set:data}, {upsert:true}, function(err, item){
        //console.log("item",item)
    });
    db.close();
  });
}

//-- store device setting --//
function store_device_settings(device) {
  MongoClient.connect('mongodb://127.0.0.1:27017/gateway', function (err, db) {
    if (err) return console.log(err);
    var collection = db.collection('devices');
    //device_settings[Object.keys(device)[0]] = device[Object.keys(device)[0]];
    console.log(device)
    collection.update({id:device.id}, {$set:device.settings}, {upsert:true}, function(err, item){
        console.log("item",item)
    });
    db.close();
    console.log('store_device_settings',device);
  });
}

//-- store new device --//
function store_device(device) {
  delete device["_id"];
  MongoClient.connect('mongodb://127.0.0.1:27017/gateway', function (err, db) {
    //console.log(TAG,"storing device",device);
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
      var collection = db.collection('devices');
      collection.update({id:device.id}, {$set:device.dbSerialize ? device.dbSerialize() : device}, {upsert:true}, function(err, item){
        //console.log("update device: ",item)
      });
      collection.find().toArray(function (err, result) {
        if (err) {
          console.log(err);
        } else if (result.length) {
	  device_array = result;
        } else {
          console.log(TAG,'store_device | no results');
        }
      });
      db.close();
    }
  });
  get_devices();
}

//-- load devices from database --//
function get_devices() {
  return new Promise((resolve, reject) => {
    MongoClient.connect('mongodb://127.0.0.1:27017/gateway', function (error, db) {
      if (error) {
        reject(error);
        return console.log('get_devices |', error);
      }

      const collection = db.collection('devices');

      collection.find().toArray(function (error, result) {
        if (error) {
          reject(error);
          return console.log(error);
        }

        resolve(result);
      });

      db.close();
    });
  });
}
