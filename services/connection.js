// -----------------------------  OPEN-AUTOMATION ------------------------- //
// ------------  https://github.com/physiii/open-automation --------------- //
// ------------------------------- connection.js -------------------------- //

const exec = require('child_process').exec,
  { spawn } = require('child_process'),
  request = require('request'),
  os = require('os'),
  fs = require('fs'),
  ping = require ("ping"),
  database = require ("../services/database"),
  config = require ("../config.json"),
  ap_mode = false,
  bad_connection = 0,
  TAG = "[connection-manager]";

var LastGoodConnection = Date.now();

class ConnectionManager {
  constructor () {
		this.init = this.init.bind(this);
	}

  init () {
    /*this.getLocalIP();
    this.getPublicIP();
    this.getMode();
    this.connectionLoop();*/
		return;
	}

  getStoredConnections() {
    return new Promise(function(resolve, reject) {
      database.getValueByKey("network","apList").then(function(obj) {
        resolve(obj.apList);
      })
    })
  }

  getLocalIP() {
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
        ++alias;
        return iface.address;
      });
    });
  }

  getPublicIP() {
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

  getMode() {
    return new Promise(function(resolve, reject) {
      exec("grep /etc/dhcpcd.conf -e '192.168.4.1'", (error, stdout, stderr) => {
        if (stdout.length > 1) {
          console.log(TAG, "device is in access point mode");
          resolve("AP")
        } else resolve("client");
      })
    })
  }

  setLastGoodConnection(date) {
    LastGoodConnection = date;
  }

  getLastGoodConnection() {
    return LastGoodConnection;
  }

  connectionLoop() {
      var self = this;
      console.log(TAG,"connectionLoop");
      this.getStatus().then(function(isAlive) {
        if (isAlive === 'alive') {
          console.log(TAG,"alive since:",LastGoodConnection);
          this.setLastGoodConnection(Date.now());
        }
        if (isAlive === 'dead') {
          console.log(TAG,"dead since:",LastGoodConnection);
        }
      });


      this.scanWifi().then((apScanList) => {
        console.log(TAG,apScanList);
        /*this.getMode().then(function (mode) {
          //mode = "AP";
          if (mode === "AP") {
            this.getStoredConnections().then(function(apList) {
              for (let i=0; i < apList.length; i++) {
                for (let j=0; j < apScanList.length; j++) {
                  if (apList[i].ssid === apScanList[j].ssid) {
                    this.setWifi(apList[i]);
                }
              }
            }
          })
        }
      })*/
    }, function(err) {
        console.log(err);
    })
    setTimeout(function () {
      self.connectionLoop();
    }, 20*1000);
  }

  getStatus() {
    return new Promise(function(resolve, reject) {
      let host = "8.8.8.8";
      ping.sys.probe(host, function(isAlive) {
        resolve(isAlive);
      });
    /*var msg = isAlive ? 'alive' : 'dead';
    if (msg == 'dead') {
      bad_connection++;
      console.log(TAG, 'bad_connection',bad_connection);
      if (!ap_mode && bad_connection > 2) {
        //console.log(TAG, "no connection, starting access point");
	      //this.startAP()
        var interfaces_file = "allow-hotplug wlan0\n"
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
        });
        //bad_connection = 0;
      }
    }
    if (msg == 'alive') {
      console.log(TAG, "connection is good!");
      bad_connection = 0;
    }
  });*/
  })
}

  scanWifi() {
  return new Promise(function(resolve, reject) {
    let iwlist = spawn('sudo', ['iwlist', config.wifi_adapter,'scan']);
    let router_list = [];
    iwlist.stdout.on('data', (data) => {
      let data_array = `${data}`.split('\n')
      data_array.forEach(function (ap) {
        if (ap.indexOf('ESSID') < 0) return;
        let start = ap.indexOf('\"')+1;
        let stop = ap.lastIndexOf('\"');
        ap = ap.substring(start,stop);
        router_list.push({ssid:ap});
      });
      //socket.emit('router list',router_list);
      resolve(router_list);
    });
  });
}


  startAP() {
  console.log(TAG, "starting access point...");

  let dhcpcd_ap_path = __dirname + "/files/dhcpcd.conf.ap";
  let dnsmasq_ap_path = __dirname + "/files/dnsmasq.conf.ap";
  let hostapd_ap_path = __dirname + "/files/hostapd.conf.ap";
  let hostapd_default_ap_path = __dirname + "/files/hostapd.ap";
  let rc_local_ap_path = __dirname + "/files/rc.local.ap";
  let interfaces_ap_path = __dirname + "/files/interfaces.ap";
  let sysctl_ap_path = __dirname + "/files/sysctl.conf.ap";

  //let command = "cat "+rc_local_cl_path;
  //exec(command, (error, stdout, stderr) => {console.log(stdout)});
  //console.log("sudo cp "+interfaces_ap_path+" /etc/network/interfaces");
  //exec("sudo cp "+interfaces_ap_path+" /etc/network/interfaces", (error, stdout, stderr) => {console.log(stdout)});
  exec("sudo cp "+dhcpcd_ap_path+" /etc/dhcpcd.conf", (error, stdout, stderr) => {console.log(stdout)});
  exec("sudo cp "+dnsmasq_ap_path+" /etc/dnsmasq.conf", (error, stdout, stderr) => {console.log(stdout)});
  exec("sudo cp "+hostapd_default_ap_path+" /etc/default/hostapd", (error, stdout, stderr) => {console.log(stdout)});
  exec("sudo cp "+hostapd_ap_path+" /etc/hostapd/hostapd.conf", (error, stdout, stderr) => {console.log(stdout)});
  exec("sudo cp "+sysctl_ap_path+" /etc/sysctl.conf", (error, stdout, stderr) => {console.log(stdout)});
  exec("sudo cp "+rc_local_ap_path+" /etc/rc.local", (error, stdout, stderr) => {console.log(stdout)});
  exec("sleep 2 && sudo reboot", (error, stdout, stderr) => {});
}

  setWifi(apInfo) {
    var wpa_supplicant = "ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev\n"
                       + "update_config=1\n"
		       + "country=GB\n"
                       + "network={\n"
		       + "ssid=\""+apInfo.name+"\"\n"
		       + "psk=\""+apInfo.password+"\"\n"
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

    console.log("sudo cp "+dhcpcd_cl_path+" /etc/dhcpcd.conf");
    //exec("sudo cp "+interfaces_cl_path+" /etc/network/interfaces", (error, stdout, stderr) => {console.log(stdout)});
    exec("sudo cp "+hostapd_default_cl_path+" /etc/default/hostapd", (error, stdout, stderr) => {console.log(stdout)});
    exec("sudo cp "+dhcpcd_cl_path+" /etc/dhcpcd.conf", (error, stdout, stderr) => {console.log(stdout)});
    exec("sudo cp "+rc_local_cl_path+" /etc/rc.local", (error, stdout, stderr) => {console.log(stdout)});
    //dexec("sleep 2 && sudo reboot", (error, stdout, stderr) => {});

    });

    database.getValueByKey("network","apList").then(function(obj) {
      let apList = [];
      let ssidExists = false;
      if (obj.apList) apList = obj.apList;

      for (let i=0; i < apList.length; i++) {
        if (apList[i].ssid === apInfo.ssid) {
          apList[i].password = apInfo.password;
          ssidExists = true;
        }
      }

      if (!ssidExists) apList.push(apInfo);
      database.store("network",{apList:apList});
      database.store("network",{mode:"client"});
      console.log(TAG, "setWifi", apList);
    }, function(err) {
      console.error(err);
    })
  }



}

module.exports = new ConnectionManager();
