// -----------------------------  OPEN-AUTOMATION-Project ------------------------- //
// ------------  https://github.com/physiii/open-automation-gateway --------------- //
// --------------------------------- deadbolt.js----------------------------- //

const EventEmitter = require('events');
var socket = require('../socket.js');
var config = require('../config.json');

var TAG = "[deadbolt.js]";
var test_var = "test variable";
var lock_timer;
var set_timer = config.lock_timer;
var lockDesires = new EventEmitter();


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

console.log("loading test variable _ "+test_var);



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
  if(set_timer == "0") return;
    lock_timer = setTimeout(function() {
      lock(nodeid)
    }, set_timer*1000);
}

function when_locked(nodeid){
  clearTimeout(lock_timer);
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
