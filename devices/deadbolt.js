// -----------------------------  OPEN-AUTOMATION-Project ------------------------- //
// ------------  https://github.com/physiii/open-automation-gateway --------------- //
// --------------------------------- deadbolt.js----------------------------- //

const EventEmitter = require('events');
var socket = require('../socket.js');
var config = require('../config.json');
var utils = require('../utils');

let TAG = "[deadbolt.js]";
let timers = {}
let set_timer = config.lock_timer;
let find_index = utils.find_index;
let lockDesires = new EventEmitter();


module.exports = {
  add_lock: add_lock,
  remove_lock: remove_lock,
  lock: lock,
  unlock: unlock,
  when_unlocked: when_unlocked,
  when_locked: when_locked,
  lockDesires: lockDesires
}

/*
Controlling zwave valueIDs is usually done by passing the ValueID as a Javascipt object or
as 4 discrete integer arguments:

1: ZWave Node Id,
2: Command Class,
3: Instance and
4: Index
5: Value
--------------------------------------------------------------------------------------

*/

//---------------Socket Calls ----------------------------------
socket.relay.on('set lock', function(data) {
  //if (data.token != token) return console.log(TAG,"invalid token!");
  console.log(TAG,"set lock",data.action);
  if (data.action == "lock") lock(data.id);
  if (data.action == "unlock") unlock(data.id);
})

socket.relay.on('set lock group', function(data) {
  //if (data.token != token) return console.log(TAG,"invalid token!");
  console.log(TAG,"set lock group",data.action);
  if (data.action == "arm") {
    for (id in data.id){
      console.log(TAG, "Armed id:", id);
      lock(id);
    }
  }
  if (data.action == "disarm") {
    for (id in data.id) {
      console.log(TAG, "Disarmed id:", id);
      unlock(id);
    }
  }
})


//---------------------------Functions------------------------------------
function when_unlocked(nodeid){
  if (!set_timer) return;
  timers[nodeid] = setTimeout(function() {
    console.log('Door',nodeid,"lock timer expired. Relocking door."); 
    lock(nodeid);
   }, set_timer*1000);  
  console.log(TAG,
              'Detected door',
              nodeid,
              'unlocked. Setting relock timer.')
}

function when_locked(nodeid){  
  if (!timers[nodeid]) return console.log(TAG, 'No relock timer detected for door',nodeid);
  console.log(TAG, 'Detected door',nodeid,'locked. Removing relock timer.')
  clearTimeout(timers[nodeid]);
}

function add_lock() {
  lockDesires.emit('deadbolt/add');
}

function remove_lock() {
  lockDesires.emit('deadbolt/remove');
}

function unlock(nodeid) {
  lockDesires.emit('deadbolt/desiredState', nodeid, false);
}

function lock(nodeid) {
  lockDesires.emit('deadbolt/desiredState', nodeid, true);
}

