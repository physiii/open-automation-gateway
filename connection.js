// -----------------------------  OPEN-AUTOMATION ------------------------- //
// ------------  https://github.com/physiii/open-automation --------------- //
// ------------------------------- connection.js -------------------------- //

var exec = require('child_process').exec;
var request = require('request');
var os = require('os');
var fs = require('fs');
var ping = require ("ping");
var router_array = [];
var router_list = [];
var ap_mode = false;
var bad_connection = 0;
//var local_ip = "init";
//var public_ip = "init";
var TAG = "[connection.js]";

module.exports = {
  start_ap: start_ap,
  get_local_ip: get_local_ip,
  get_public_ip: get_public_ip,
  check_connection: check_connection,
  check_connection_loop: check_connection_loop,
  check_ap_mode: check_ap_mode,
  scan_wifi: scan_wifi,
  set_wifi: set_wifi
}

get_local_ip();
function get_local_ip() {
var ifaces = os.networkInterfaces();
Object.keys(ifaces).forEach(function (ifname) {
  var alias = 0;
  ifaces[ifname].forEach(function (iface) {
    if ('IPv4' !== iface.family || iface.internal !== false) {
      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      return;
    }
    if (alias >= 1) {
      // this single interface has multiple ipv4 addresses
      //console.log(ifname + ':' + alias, iface.address);
    } else {
      // this interface has only one ipv4 adress
      //console.log(ifname, iface.address);
    }
    local_ip = iface.address;
    ++alias;
    module.exports.local_ip = local_ip;
  });
});
}

get_public_ip();
function get_public_ip() {
  request.get(
  'http://pyfi.org/get_ip',
  function (error, response, data) {
    if (!error && response.statusCode == 200) {
      if (error !== null) console.log(error);
      module.exports.public_ip = data;
      //console.log("stored public_ip",public_ip);
    }
  });
}

check_ap_mode();
function  check_ap_mode() {
  exec("grep /etc/dhcpcd.conf -e '192.168.4.1'", (error, stdout, stderr) => {
    if (stdout.length > 1) {
      console.log(TAG, "device is in access point mode");
      ap_mode = true; 
    } else ap_mode = false;
  });
}

check_connection_loop();
function check_connection_loop() {
  setTimeout(function () {
    check_connection();
    check_connection_loop();
  }, 20*1000);
}

function check_connection() {
  host = "8.8.8.8";
  ping.sys.probe(host, function(isAlive) {
    var msg = isAlive ? 'alive' : 'dead';
    if (msg == 'dead') {
      bad_connection++;
      console.log(TAG, 'bad_connection',bad_connection);
      if (!ap_mode && bad_connection > 1) {
        console.log(TAG, "no connection, starting access point");
	start_ap()
        /*var interfaces_file = "allow-hotplug wlan0\n"
                   + "iface wlan0 inet static\n"
    		   + "address 172.24.1.1\n"
    		   + "netmask 255.255.255.0\n"
    		   + "network 172.24.1.0\n"
    		   + "broadcast 172.24.1.255\n";
        fs.writeFile("/etc/network/interfaces", interfaces_file, function(err) {
          if(err) return console.log(err);
          console.log("Interface file saved, starting AP");
          exec("sudo ifdown wlan0 && sudo ifup wlan0 && sudo service dnsmasq restart && sudo hostapd /etc/hostapd/hostapd.conf");
          ap_mode = true;

          ap_time_start = Date.now();
        });*/
        //bad_connection = 0;
      }
    }
    if (msg == 'alive') {
      console.log(TAG, "connection is good!");
      bad_connection = 0;
    }
  });
}

function scan_wifi() {
  console.log(TAG, "scanning wifi...");
  //let command = "ls";
  //let command = "sudo iwlist wlx7c8bca050268 scan | grep 'ESSID'";
  let command = "sudo iwlist wlan0 scan | grep 'ESSID'";
  return new Promise(function(resolve, reject) {
  exec(command, (error, stdout, stderr) => {

    if (error) {
      reject(error);
      //console.error(`exec error: ${error}`);
      return;
    }
    router_array = stdout.split('\n');
    router_list = [];
    for(var i = 0; i < router_array.length; i++) {
      var router_ssid = router_array[i].replace(/^\s*/, "")
  			             .replace(/\s*$/, "")
 			             .replace("ESSID:\"","")
    			             .replace("\"","");
      router_list.push({ssid:router_ssid});
    }
    //console.log("router_array | " + JSON.stringify(router_list));
    resolve(router_list);

  });
  })
}

function start_ap() {
  console.log(TAG, "starting access point...");

  let dhcpcd_ap_path = __dirname + "/files/dhcpcd.conf.ap";
  let hostapd_ap_path = __dirname + "/files/hostapd.conf.ap";
  let hostapd_default_ap_path = __dirname + "/files/hostapd.ap";
  let rc_local_ap_path = __dirname + "/files/rc.local.ap";
  let interfaces_ap_path = __dirname + "/files/interfaces.ap";
  let sysctl_ap_path = __dirname + "/files/interfaces.ap";

  //let command = "cat "+rc_local_cl_path;
  //exec(command, (error, stdout, stderr) => {console.log(stdout)});
  //console.log("sudo cp "+interfaces_ap_path+" /etc/network/interfaces");
  //exec("sudo cp "+interfaces_ap_path+" /etc/network/interfaces", (error, stdout, stderr) => {console.log(stdout)});
  exec("sudo cp "+dhcpcd_ap_path+" /etc/dhcpcd.conf", (error, stdout, stderr) => {console.log(stdout)});
  exec("sudo cp "+hostapd_default_ap_path+" /etc/default/hostapd", (error, stdout, stderr) => {console.log(stdout)});
  exec("sudo cp "+hostapd_ap_path+" /etc/hostapd/hostapd.conf", (error, stdout, stderr) => {console.log(stdout)});
  exec("sudo cp "+sysctl_ap_path+" /etc/sysctl.conf", (error, stdout, stderr) => {console.log(stdout)});
  exec("sudo cp "+rc_local_ap_path+" /etc/rc.local", (error, stdout, stderr) => {console.log(stdout)});
  exec("sleep 2 && sudo reboot", (error, stdout, stderr) => {});

}

function set_wifi(data) {
    console.log(TAG, "set_wifi",data);

    var wpa_supplicant = "ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev\n"
                       + "update_config=1\n"
		       + "country=GB\n"
                       + "network={\n"
		       + "ssid=\""+data.ap_name+"\"\n"
		       + "psk=\""+data.ap_password+"\"\n"
		       + "key_mgmt=WPA-PSK\n"
		       + "}\n";

    var interfaces_file = "source-directory /etc/network/interfaces.d\n"
			+ "auto lo\n"
			+ "iface lo inet loopback\n"
			+ "iface eth0 inet manual\n"
			+ "allow-hotplug wlan0\n"
			+ "iface wlan0 inet manual\n"
		    	+ "    wpa-conf /etc/wpa_supplicant/wpa_supplicant.conf\n";

    fs.writeFile("/etc/wpa_supplicant/wpa_supplicant.conf", wpa_supplicant, function(err) {
      if(err) {
        return console.error(TAG, err);
      }

	let dhcpcd_cl_path = __dirname + "/files/dhcpcd.conf.cl";
	let hostapd_cl_path = __dirname + "/files/hostapd.conf.cl";
	let hostapd_default_cl_path = __dirname + "/files/hostapd.cl";
	let rc_local_cl_path = __dirname + "/files/rc.local.cl";
	let interfaces_cl_path = __dirname + "/files/rc.local.cl";

	//let command = "cat "+rc_local_cl_path;
        //exec(command, (error, stdout, stderr) => {console.log(stdout)});

	console.log("sudo cp "+dhcpcd_cl_path+" /etc/dhcpcd.conf");
        //exec("sudo cp "+interfaces_cl_path+" /etc/network/interfaces", (error, stdout, stderr) => {console.log(stdout)});
        exec("sudo cp "+hostapd_default_cl_path+" /etc/default/hostapd", (error, stdout, stderr) => {console.log(stdout)});
        exec("sudo cp "+dhcpcd_cl_path+" /etc/dhcpcd.conf", (error, stdout, stderr) => {console.log(stdout)});
        exec("sudo cp "+rc_local_cl_path+" /etc/rc.local", (error, stdout, stderr) => {console.log(stdout)});
        exec("sleep 2 && sudo reboot", (error, stdout, stderr) => {});


      /*fs.writeFile("/etc/network/interfaces", interfaces_file, function(err) {
        if(err) {
          return console.log(err);
        }

        exec("sudo /bin/sh -c 'if ! [ \"$(ping -c 1 8.8.8.8)\" ]; then echo \"resetting wlan0\" && sudo ifdown wlan0 && sudo ifup wlan0; else echo \"connection is good\"; fi'", (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            return;
          }
          console.log(stdout);
          console.log(stderr);
          //ap_mode = false;
          setTimeout(function () {
            //check_connection();
          }, 30*1000);
        });
      });*/
    });
  console.log(TAG, "set_wifi");
}
