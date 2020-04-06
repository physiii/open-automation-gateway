// -----------------------------  OPEN-AUTOMATION ------------------------- //
// ------------  https://github.com/physiii/open-automation --------------- //
// ------------------------------- connection.js -------------------------- //

const exec = require('child_process').exec,
  { spawn } = require('child_process'),
  request = require('request'),
  os = require('os'),
  fs = require('fs'),
  ping = require ("ping"),
  Database = require ("../services/database.js"),
  System = require ("../services/system.js"),
  config = require ("../config.json"),
  CONNECTION_LOOP_TIME = 20, //seconds between running connectionLoop
  CONNECTION_TIMEOUT = config.connection_timeout || 60, //seconds to consider connection timed out
  TAG = "[connection-manager]"
  router_list = [],
  mac = "";

var LastGoodConnection = Date.now();

class ConnectionManager {

  constructor () {
		this.init = this.init.bind(this);
	}

  init () {
		return;
	}

  connectionLoop() {
		var self = this;

    if (config.manage_network === false) return;

    self.getLocalIP()
		.then((localIPs) => {
			self.localIPs = localIPs;
      if (localIPs.length > 0) {
        self.setCurrentAPStatus("connected");
        self.setConnAttempts(0);
        self.setLastGoodConnection();
      } else {
        let difference = Date.now() - LastGoodConnection;
        console.log(TAG,"bad connection, last good:",difference);
        if (difference > CONNECTION_TIMEOUT * 1000) {
          self.setCurrentAPStatus("disconnected");
          self.getMode().then((mode) => {
            if (mode !== "AP") self.startAP();
          })
        }
      }
    })
		.then(() => {
			self.getPublicIP()
			.then((public_ip) => {
				self.public_ip = public_ip;
			});
		})

    self.scanWifi().then((apScanList) => {
      self.getMode().then((mode) => {
        if (mode === "AP") {
          self.getStoredConnections().then(function(apList) {
            for (let i=0; i < apList.length; i++) {
              for (let j=0; j < apScanList.length; j++) {
                if (apList[i].ssid === apScanList[j].ssid) {
                  if (apList[i].connAttempts <= 3) {
                    self.setWifi(apList[i]);
                  } else console.log("3 failed attempts with ssid on scan",apList[i].ssid);
                }
              }
            }
          })
        }
      })
    }, function(err) {
      console.log(err);
    })

    setTimeout(function () {
      self.connectionLoop();
    }, CONNECTION_LOOP_TIME*1000);
  }

  getStoredConnections() {
    return new Promise(function(resolve, reject) {
      Database.getValueByKey("network","apList").then((obj) => {
        if (!obj) reject();
        resolve(obj.apList);
      })
    })
  }

  getLocalIP() {
    return new Promise(function(resolve, reject) {
      let localIPs = [],
        ifaces = os.networkInterfaces();

      for (const iface of Object.keys(ifaces)) {
        for (let i=0; i<ifaces[iface].length; i++) {
          // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
          if ('IPv4' !== ifaces[iface][i].family || ifaces[iface][i].internal !== false) {
            continue;
          }
          localIPs.push(ifaces[iface][i].address);
        }
      }

      resolve(localIPs);
    });
  }

  getPublicIP() {
		const url = 'http://' + config.relay_server + ':' + config.relay_port + '/get_ip';

		return new Promise(function(resolve, reject) {
	    request.get(
	      url,
	      function (error, response, data) {
	        if (!error && response.statusCode == 200) {
	          if (error !== null) console.log(error);
	          module.exports.public_ip = data;
						resolve(data);
	      }
	    });
		});
	}

  getMAC() {
    return new Promise(function(resolve, reject) {
      require('getmac').getMac(function(err,macAddress){
          if (err)  throw err
          console.log(macAddress) // 77:31:c2:c5:03:10
          resolve(macAddress);
      })
    })
  }

  getMode() {
    return new Promise(function(resolve, reject) {
      exec("grep /etc/dhcpcd.conf -e '192.168.4.1'", (error, stdout, stderr) => {
        if (stdout.length > 1) {
          //console.log(TAG, "device is in access point mode");
          resolve("AP")
        } else resolve("client");
      })
    })
  }

  getStatus() {
    return new Promise(function(resolve, reject) {
      let host = "8.8.8.8";
      ping.sys.probe(host, function(isAlive) {
        resolve(isAlive);
      });
    })
  }

  getLastGoodConnection() {
    return LastGoodConnection;
  }

  setWifi(apInfo) {
    if (!config.manage_network) {
      return console.log("setWifi: manage network disabled in config.json");
    }

    var wpa_supplicant = "ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev\n"
           + "update_config=1\n"
           + "country=GB\n"
           + "network={\n"
           + "ssid=\""+apInfo.ssid+"\"\n"
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
    });

    let dhcpcd_cl_path = __dirname + "/../files/dhcpcd.conf.cl";
    let hostapd_cl_path = __dirname + "/../files/hostapd.conf.cl";
    let hostapd_default_cl_path = __dirname + "/../files/hostapd.cl";
    let rc_local_cl_path = __dirname + "/../files/rc.local.cl";
    let interfaces_cl_path = __dirname + "/../files/rc.local.cl";

    console.log("setWifi: sudo cp "+dhcpcd_cl_path+" /etc/dhcpcd.conf");
    //exec("sudo cp "+interfaces_cl_path+" /etc/network/interfaces", (error, stdout, stderr) => {console.log(stdout)});
    exec("sudo cp "+hostapd_default_cl_path+" /etc/default/hostapd", (error, stdout, stderr) => {console.log(stdout)});
    exec("sudo cp "+dhcpcd_cl_path+" /etc/dhcpcd.conf", (error, stdout, stderr) => {console.log(stdout)});
    exec("sudo cp "+rc_local_cl_path+" /etc/rc.local", (error, stdout, stderr) => {console.log(stdout)});

    Database.getValueByKey("network","apList").then(function(obj) {
      apInfo.lastStatus = "connecting";
      let apList = [];
      let ssidExists = false;
      if (obj)
        if (obj.apList) apList = obj.apList;

      for (let i=0; i < apList.length; i++) {
        if (apList[i].ssid === apInfo.ssid) {
          apList[i].connAttempts+=1;
          apList[i].password = apInfo.password;
          ssidExists = true;
        }
      }

      if (!ssidExists) apList.push(apInfo);
      Database.store("network",{apList:apList});
      Database.store("network",{mode:"client"});
      Database.store("network",{current_ap:{ssid:apInfo.ssid}});

      console.log(TAG, "setWifi", apList);
    }, function(err) {
      console.error(err);
    })

    System.reboot(3);
  }

  setLastGoodConnection() {
    LastGoodConnection = Date.now();
    return;
  }

  setConnAttempts(attemps) {
    Database.getValueByKey("network","current_ap").then((obj) => {
      if (!obj) return; // console.log(TAG,"current_ap not found");
      let ssid = obj.current_ap.ssid
      Database.getValueByKey("network","apList").then((obj) => {
      let apList = [];
      if (obj.apList) apList = obj.apList;
      for (let i=0; i < apList.length; i++) {
        if (apList[i].ssid === ssid) {
          apList[i].connAttempts = attemps;
        }
      }
      Database.store("network",{apList:apList});

      }, function(err) {
        console.error(TAG, "setConnAttempts", err);
      })
    })
  }

  setCurrentAPStatus(status) {
    Database.getValueByKey("network","current_ap").then((obj) => {
      if (!obj) return; // console.log(TAG,"current_ap not found");
      let ssid = obj.current_ap.ssid
      Database.getValueByKey("network","apList").then((obj) => {
        let apList = [];
        if (obj.apList) apList = obj.apList;
        for (let i=0; i < apList.length; i++) {
          if (apList[i].ssid === ssid) {
            apList[i].lastStatus = status;
          }
        }
        Database.store("network",{apList:apList});

      }, function(err) {
        console.error(TAG, "setCurrentAPStatus", err);
      })
    })
  }

  scanWifi() {
    return new Promise(function(resolve, reject) {
      let iwlist = spawn('sudo', ['iwlist', config.wifi_adapter,'scan']);
      iwlist.stdout.on('data', (data) => {
      let arr = `${data}`.split('\n');
	    for (let i=0; i < arr.length; i++) {
          if (arr[i].indexOf('ESSID') < 0) continue;
          let start = arr[i].indexOf('\"')+1;
          let stop = arr[i].lastIndexOf('\"');
          arr[i] = arr[i].substring(start,stop);
          let matchFound = false;
          for (let j=0; j < router_list.length; j++) {
            if (router_list[j].ssid === arr[i]) {
              // console.log(TAG,"Access point already in list");
              matchFound = true;
            }
          }
          if (!matchFound) router_list.push({ssid:arr[i]});
	    }
      resolve(router_list);
      });
    });
  }


  startAP() {
    if (!config.manage_network) {
      return console.log("startAP: manage network disabled in config.json");
    }
    console.log(TAG, "starting access point...");
    Database.store("network",{mode:"AP"});
    let dhcpcd_ap_path = __dirname + "/../files/dhcpcd.conf.ap";
    let dnsmasq_ap_path = __dirname + "/../files/dnsmasq.conf.ap";
    let hostapd_ap_path = __dirname + "/../files/hostapd.conf.ap";
    let hostapd_default_ap_path = __dirname + "/../files/hostapd.ap";
    let rc_local_ap_path = __dirname + "/../files/rc.local.ap";
    let interfaces_ap_path = __dirname + "/../files/interfaces.ap";
    let sysctl_ap_path = __dirname + "/../files/sysctl.conf.ap";

    this.getMAC().then(function(mac_addr) {
      var cam_id = mac_addr.replace(/:/g,"");
      cam_id = cam_id.slice(-6);
      let ssid_name = "Camera_"+cam_id;
      console.log(TAG,"ssid set to", ssid_name);
      let hostapd_conf = "interface=wlan0\n"
        + "driver=nl80211\n"
        + "ssid="+ssid_name+"\n"
        + "hw_mode=g\n"
        + "channel=7\n"
        + "wmm_enabled=0\n"
        + "macaddr_acl=0\n"
        + "auth_algs=1\n"
        + "ignore_broadcast_ssid=0\n"
        + "wpa=2\n"
        + "wpa_passphrase=pyfitech\n"
        + "wpa_key_mgmt=WPA-PSK\n"
        + "wpa_pairwise=TKIP\n"
        + "rsn_pairwise=CCMP\n";

        fs.writeFile("/etc/hostapd/hostapd.conf", hostapd_conf, function(err) {
         if(err) {
            return console.error(TAG, err);
         }
        });

      console.log("sudo cp "+dhcpcd_ap_path+" /etc/dhcpcd.conf");
      //exec("sudo cp "+interfaces_ap_path+" /etc/network/interfaces", (error, stdout, stderr) => {console.log(stdout)});
      exec("sudo cp "+dhcpcd_ap_path+" /etc/dhcpcd.conf", (error, stdout, stderr) => {console.log(stdout)});
      exec("sudo cp "+dnsmasq_ap_path+" /etc/dnsmasq.conf", (error, stdout, stderr) => {console.log(stdout)});
      exec("sudo cp "+hostapd_default_ap_path+" /etc/default/hostapd", (error, stdout, stderr) => {console.log(stdout)});
      // exec("sudo cp "+hostapd_ap_path+" /etc/hostapd/hostapd.conf", (error, stdout, stderr) => {console.log(stdout)});
      exec("sudo cp "+sysctl_ap_path+" /etc/sysctl.conf", (error, stdout, stderr) => {console.log(stdout)});
      exec("sudo cp "+rc_local_ap_path+" /etc/rc.local", (error, stdout, stderr) => {console.log(stdout)});
      System.reboot(3);

    }, function(err) {
        console.log(err);
    })  }

}

module.exports = new ConnectionManager();
