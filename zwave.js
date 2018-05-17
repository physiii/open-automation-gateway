// -----------------------------  OPEN-AUTOMATION ------------------------- //
// ------------  https://github.com/physiii/open-automation --------------- //
// --------------------------------- zwave.js ----------------------------- //

const socket = require('../socket.js'),
  os = require('os'),
  config = require('../config.json'),
  database = require('../database'),
  OpenZWave = require('openzwave-shared'),
  zwave = new OpenZWave({
  	ConsoleOutput: false,
  	Logging: false,
  	SaveConfiguration: false,
  	DriverMaxAttempts: 3,
  	PollInterval: 500,
  	SuppressValueRefresh: true,
    // TODO: Don't use the same key for every gateway.
  	NetworkKey: '0x01,0x02,0x03,0x04,0x05,0x06,0x07,0x08,0x09,0x0A,0x0B,0x0C,0x0D,0x0E,0x0F,0x10'
  }),
  nodes = {},
  TAG = '[zwave.js]';

module.exports = {
	zwave,
	add_node,
	remove_node,
  get_node,
  get_value
};

zwave.on('driver ready', function (home_id) {
	console.log(TAG, '=================== DRIVER READY! ====================');
	console.log(TAG, 'scanning home_id=0x%s...', home_id.toString(16));
});

zwave.on('driver failed', function () {
	console.log(TAG, 'failed to start driver');
});

zwave.on('node added', function (node_id) {
	console.log(TAG, '=================== NODE ADDED! ====================', node_id);
	nodes[node_id] = {
		manufacturer: '',
		manufacturerid: '',
		product: '',
		producttype: '',
		productid: '',
		type: '',
		name: '',
		loc: '',
		classes: {},
		ready: false,
	};
});

zwave.on('value added', function (node_id, com_class, value) {
  if (!nodes[node_id]['classes'][com_class]) {
    nodes[node_id]['classes'][com_class] = {};
  }

  nodes[node_id]['classes'][com_class][value.index] = value;

  database.store_zwave_node(nodes[node_id]);
});

zwave.on('value changed', function (node_id, com_class, value) {
  if (nodes[node_id]['ready']) {
    console.log(TAG, 'node%d: changed: %d:%s:%s->%s', node_id, com_class,
      value['label'],
      nodes[node_id]['classes'][com_class][value.index]['value'],
      value['value']);

    console.log(TAG, 'value changed', nodes[node_id].product);

    database.store_zwave_node(nodes[node_id]);
  };

  nodes[node_id]['classes'][com_class][value.index] = value;
});

zwave.on('value removed', function (node_id, com_class, index) {
	if (nodes[node_id]['classes'][com_class] && nodes[node_id]['classes'][com_class][index]) {
		delete nodes[node_id]['classes'][com_class][index];
  }

  database.store_zwave_node(nodes[node_id]);
});

zwave.on('node ready', function (node_id, node_info) {
  nodes[node_id]['id'] = node_id;
  nodes[node_id]['info'] = node_info;
	nodes[node_id]['ready'] = true;

	console.log(TAG, 'node%d: %s, %s', node_id,
		    node_info.manufacturer ? node_info.manufacturer
					  : 'id=' + node_info.manufacturerid,
		    node_info.product ? node_info.product
				     : 'product=' + node_info.productid +
				       ', type=' + node_info.producttype);
	console.log(TAG, 'node%d: name="%s", type="%s", location="%s"', node_id,
		    node_info.name,
		    node_info.type,
		    node_info.loc);

 	database.store_zwave_node(nodes[node_id]);

	for (var com_class in nodes[node_id]['classes']) {
		switch (com_class) {
  		case 0x25: // COMMAND_CLASS_SWITCH_BINARY
  		case 0x26: // COMMAND_CLASS_SWITCH_MULTILEVEL
  			zwave.enablePoll(node_id, com_class);
  			break;
		}
	}
});

zwave.on('notification', function (node_id, notif, help) {
	console.log(TAG, 'node%d: notification(%d): %s', node_id, notif, help);
});

zwave.on('scan complete', function () {
	console.log(TAG, 'zwave scan complete');
});

var zwave_driver_paths = {
	'darwin' : '/dev/cu.usbmodem1411',
	'linux'  : '/dev/tty'+config.zwave_dev,
	'windows': '\\\\.\\COM3'
};

database.get_zwave_nodes().then((zwave_nodes) => {
  nodes = zwave_nodes;
  console.log(TAG, 'connecting to ' + zwave_driver_paths[os.platform()]);
  zwave.connect(zwave_driver_paths[os.platform()]);
});

process.on('SIGINT', function () {
	console.log(TAG, 'disconnecting...');
	zwave.disconnect();
	process.exit();
});

function add_node(secure) {
  zwave.addNode(secure);
}

function remove_node() {
  console.log(TAG, 'remove node...');
  zwave.removeNode();
}

function get_node (node_id) {
  return nodes[node_id];
}

function get_value (node_id, com_class, index) {
  return nodes[node_id]['classes'][com_class][index]['value'];
}
