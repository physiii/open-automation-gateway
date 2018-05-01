// -----------------------------  OPEN-AUTOMATION-Project ------------------------- //
// ------------  https://github.com/physiii/open-automation-gateway --------------- //
// --------------------------------- deadbolt.js----------------------------- //

var socket = require('../socket.js');
var zwave = require('./zwave.js');
var config = require('../config.json');
var TAG = "[deadbolt.js]";
var test_var = "test variable";
var set_timer = config.lock_timer;


module.exports = {
  test_lock: test_lock,
	unlock: unlock,
	lock: lock,
  //check_values: check_values,
  //auto_lock: auto_lock,
	test_var:test_var
}

/*
Controlling zwave valueIDs is usually done by passing the ValueID as a Javascipt object or
as 4 discrete integer arguments:

1: ZWave Node Id,
2: Command Class,
3: Instance and
4: Index
--------------------------------------------------------------------------------------


data = {token: token, action:"lock"/"unlock", id:""}
*/

console.log("loading test variable _ "+test_var);



//-------------------------------Socket Calls -----------------------------------------
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
/*
function auto_lock(nodeid) {
  if (set_timer === "0") return;
  setTimeout(function(nodeid) {
    lock(nodeid)}, set_timer*1000);
};


function check_values(nodeid,comclass,value){
  if(comclass != 98) return;
  if(value.label != lock) return;
  if(value.value) return;
  auto_lock(nodeid)
};
*/

function add_lock() {
  zwave.add_node(1)
}

function remove_lock() {
  zwave.remove_node()
}

function unlock(nodeid) {
  zwave.set_value(nodeid,98, 0, false);
}

function lock(nodeid) {
  zwave.set_value(nodeid,98, 0, true);
}

function test_lock(){
	console.log("running lock test")
  lock(4, 98, 0);
  unlock(4, 98, 0);
};

function check_status(){continue};
