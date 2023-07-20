// -----------------------------  OPEN-AUTOMATION ------------------------- //
// ------------  https://github.com/physiii/open-automation --------------- //
// --------------------------------- zwave.js ----------------------------- //

const os = require('os'),
  config = require('./config.json'),
  database = require('./services/database.js'),
  OpenZWave = require('openzwave-shared'),
  zwave = new OpenZWave({
    ConsoleOutput: false,
    Logging: false,
    SaveConfiguration: false,
    DriverMaxAttempts: 3,
    PollInterval: 30000,
    SuppressValueRefresh: true,
    // TODO: Don't use the same key for every gateway.
    NetworkKey: '0x01,0x02,0x03,0x04,0x05,0x06,0x07,0x08,0x09,0x0A,0x0B,0x0C,0x0D,0x0E,0x0F,0x10'
  }),
  TAG = '[zwave.js]';
let nodes = {};

module.exports = {
  on,
  poll,
  add_node,
  remove_node,
  get_node,
  get_value,
  set_value,
  is_node_ready
};

zwave.on('driver ready', function (home_id) {
  console.log(TAG, 'Driver ready. Scanning home_id 0x' + home_id.toString(16));
});

zwave.on('driver failed', function () {
  console.error(TAG, 'Failed to start driver.');
});

zwave.on('node added', function (node_id) {
  console.log(TAG, 'Node ' + node_id + ' added.');

  if (nodes[node_id]) {
    return;
  }

  nodes[node_id] = {
    id: node_id,
    info: {},
    classes: {},
    ready: false,
  };
});

zwave.on('value added', function (node_id, com_class, value) {
  const node = nodes[node_id];

  if (!node.classes[com_class]) {
    node.classes[com_class] = {};
  }

  node.classes[com_class][value.index] = value;

  db_store_node(node);
});

zwave.on('value changed', function (node_id, com_class, value) {
  const node = nodes[node_id],
    original_value = node.classes[com_class][value.index],
    is_changed = original_value['value'] !== value['value'];

  // Update the value on the stored node.
  node.classes[com_class][value.index] = value;

  if (node.ready && is_changed) {
    console.log(
      TAG + ' Value changed. Node %d "%s" changed from "%s" to "%s" (command class %d).',
      node_id,
      value['label'],
      original_value['value'],
      value['value'],
      com_class
    );
  };
});

zwave.on('value removed', function (node_id, com_class, index) {
  const node = nodes[node_id];

  if (node.classes[com_class] && node.classes[com_class][index]) {
    delete node.classes[com_class][index];
  }

  db_store_node(node);
});

zwave.on('node ready', function (node_id, node_info) {
  const node = nodes[node_id];

  node.id = node_id;
  node.info = node_info;
  node.ready = true;

  console.log(
    TAG + ' Node %d%s ready. %s, %s',
    node_id,
    node_info.name
      ? ' "' + node_info.name + '"'
      : '',
    node_info.type
      ? node_info.type
      : node_info.producttype,
    node_info.manufacturer
      ? node_info.manufacturer
      : node_info.manufacturerid
  );

  db_store_node(node);
});

zwave.on('notification', function (node_id, notif, help) {
  console.log(TAG + ' Node %d: %s (%d)', node_id, help, notif);
});

zwave.on('scan complete', function () {
  console.log(TAG, 'Scan complete.');
});

var zwave_driver_paths = {
  'darwin' : '/dev/cu.usbmodem1411',
  'linux'  : '/dev/tty'+config.zwave_dev,
  'windows': '\\\\.\\COM3'
};

// Connect to zwave network.
if (config.zwave) {
  database.get_zwave_nodes().then((zwave_nodes) => {
    nodes = zwave_nodes;
    console.log(TAG, 'Connecting to ' + zwave_driver_paths[os.platform()]);
    zwave.connect(zwave_driver_paths[os.platform()]);
  }).catch((error) => {
    console.error(TAG, error);
  });
}

process.on('SIGINT', function () {
  console.log(TAG, 'Disconnecting...');
  zwave.disconnect();
  process.exit();
});

function on () {
  zwave.on.apply(zwave, arguments);
}

function poll (node_id, com_class, value, intensity) {
  zwave.enablePoll(get_node(node_id).classes[com_class][value], intensity || 1);
}

function add_node (secure) {
  console.log(TAG, 'Add node...');
  zwave.addNode(secure);
}

function remove_node() {
  console.log("remove node...");
  zwave.removeNode();
}

function get_node (node_id) {
  return nodes[node_id];
}

function get_value (node_id, com_class, index) {
  return nodes[node_id].classes[com_class][index].value;
}

function set_value () {
  zwave.setValue.apply(zwave, arguments);
}

function is_node_ready (node_id) {
  const node = get_node(node_id);
  return Boolean(node && node.ready);
}

function db_store_node (node) {
  database.store_zwave_node(db_serialize_node(node));
}

function db_serialize_node (node) {
  return {
    id: node.id,
    info: node.info,
    classes: {},
    ready: false
  };
}
