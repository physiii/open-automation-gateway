// -----------------------------	OPEN-AUTOMATION ------------------------- //
// ------------	https://github.com/physiii/open-automation --------------- //
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
	getMacAddress = require('getmac').default;

let LastGoodConnection = Date.now();

class ConnectionManager {

	constructor () {
		this.init = this.init.bind(this);
		this.MAC = getMacAddress();
		console.log("MAC Address Is: ", this.MAC);
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
			let ip = localIPs[0]
			let firstQuart = '';
			if (ip) firstQuart = ip.substring(0, ip.indexOf('.'));
 			if (localIPs.length > 0 && firstQuart != '169') {
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
		if (!config.manage_network) return console.log(TAG, "Manage network disabled in config.json");

		this.writeWPA('client', apInfo);
		this.writeHostAPD('client');
		this.writeDHCP('client');
		this.writeRcLocal('client');

		Database.getValueByKey("network","apList").then(function(obj) {
			apInfo.lastStatus = "connecting";
			let apList = [];
			let ssidExists = false;
			if (obj)
				if (obj.apList) apList = obj.apList;

			for (let i=0; i < apList.length; i++) {
				if (apList[i].ssid === apInfo.ssid) {
					apList[i].connAttempts += 1;
					apList[i].password = apInfo.password;
					ssidExists = true;
				}
			}

			if (!ssidExists) apList.push(apInfo);
			Database.store("network",{apList:apList});
			Database.store("network",{mode:"client"});
			Database.store("network",{current_ap:{ssid:apInfo.ssid}});

			console.log(TAG, "setWifi", apList);
			System.reboot();
		}, function(err) {
			console.error(err);
		});
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
		if (!config.manage_network) return console.log(TAG, "startAP: Manage network disabled in config.json");

		console.log(TAG, "Starting access point.");
		Database.store("network",{mode:"AP"});
		this.writeHostAPD('ap');
		this.writeDHCP('ap');
		this.writeDNS('ap');
		this.writeSysctl('ap');
		this.writeRcLocal('ap');

		System.reboot();
	}

	writeWPA (mode, apInfo) {
		let path = "/etc/wpa_supplicant/wpa_supplicant.conf",
			fileAP = "rm /data/db/mongod.lock\n"
				+ "mongod &\n"
				+ "\n"
				+ "su pi -c 'pm2 start /home/pi/camera/index.js --name camera'\n"
				+ "modprobe v4l2loopback video_nr=10,20\n"
				+ "modprobe snd-aloop enable=1,1,1 index=4,5,6\n"
				+ "\n"
			+ "exit 0\n",
			fileClient = "ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev\n"
				+ "update_config=1\n"
				+ "country=GB\n"
				+ "network={\n"
				+ "ssid=\""+apInfo.ssid+"\"\n"
				+ "psk=\""+apInfo.password+"\"\n"
				+ "key_mgmt=WPA-PSK\n"
				+ "}\n";

		let file = mode == 'ap' ? fileAP : fileClient;

		fs.writeFileSync(path, file, function(err) {
			if(err) return console.error(TAG, err);
		});

		console.log("writeWPA", file);
	}

	writeRcLocal (mode) {
		let path = "/etc/rc.local",
			fileAP = "#!/bin/sh\n\n"
				+ "rm /data/db/mongod.lock\n"
				+ "mongod &\n\n"
				+ "su pi -c 'pm2 start /home/pi/camera/index.js --name camera'\n"
				+ "modprobe v4l2loopback video_nr=10,20\n"
				+ "modprobe snd-aloop enable=1,1,1 index=4,5,6\n"
				+ "\n"
			+ "exit 0\n",
			fileClient = "#!/bin/sh\n\n"
				+ "rm /data/db/mongod.lock\n"
				+ "mongod &\n\n"
				+ "su pi -c 'pm2 start /home/pi/camera/index.js --name camera'\n"
				+ "modprobe v4l2loopback video_nr=10,20\n"
				+ "modprobe snd-aloop enable=1,1,1 index=4,5,6\n"
				+ "\n"
				+ "exit 0\n";

		let file = mode == 'ap' ? fileAP : fileClient;

		fs.writeFileSync(path, file, function(err) {
			if(err) return console.error(TAG, err);
		});

		console.log("writeRcLocal", file);
	}

	writeSysctl () {
		let path = "/etc/sysctl.conf",
			file = "net.ipv4.ip_forward=1\n";

		fs.writeFileSync(path, file, function(err) {
		 if(err) {
				return console.error(TAG, err);
		 }
		});
	}

	writeDNS (mode) {
		let path = "/etc/dnsmasq.conf",
			file = "interface=wlan0\n"
				+ "  dhcp-range=192.168.4.2,192.168.4.20,255.255.255.0,24h\n";

		fs.writeFileSync(path, file, function(err) {
			if(err) return console.error(TAG, err);
		});
	}

	writeDHCP (mode) {
		let path = "/etc/dhcpcd.conf",
			fileAP = "hostname\n"
				+ "clientid\n"
				+ "persistent\n"
				+ "option rapid_commit\n"
				+ "option domain_name_servers, domain_name, domain_search, host_name\n"
				+ "option classless_static_routes\n"
				+ "option ntp_servers\n"
				+ "option interface_mt\n"
				+ "require dhcp_server_identifier\n"
				+ "slaac private\n"
				+ "interface wlan0\n"
			  + "static ip_address=192.168.4.1/24\n"
			  + "nohook wpa_supplicant\n",
			fileClient = "hostname\n"
				+ "clientid\n"
				+ "persistent\n"
				+ "option rapid_commit\n"
				+ "option domain_name_servers, domain_name, domain_search, host_name\n"
				+ "option classless_static_routes\n"
				+ "option ntp_servers\n"
				+ "option interface_mtu\n"
				+ "require dhcp_server_identifier\n"
				+ "slaac private\n";

		let file = mode == 'ap' ? fileAP : fileClient;

		fs.writeFileSync(path, file, function(err) {
			if(err) return console.error(TAG, err);
		});

		console.log("writeDHCP", file);
	}

	writeHostAPD (mode) {
		let cam_id = this.MAC.replace(/:/g,"").slice(-6),
			ssid_name = "Camera_"+cam_id,
			path = "/etc/default/hostapd",
			fileAP = "interface=wlan0\n"
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
				+ "rsn_pairwise=CCMP\n",
				fileClient = '#DAEMON_CONF="/etc/hostapd/hostapd.conf"\n';

		let file = mode == 'ap' ? fileAP : fileClient;

		fs.writeFileSync(path, file, function(err) {
			if(err) return console.error(TAG, err);
		});

		console.log(TAG, "writeHostAPD", file);
	}

}

module.exports = new ConnectionManager();
