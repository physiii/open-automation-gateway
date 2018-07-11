#!/bin/sh -e
#
# rc.local
#
# This script is executed at the end of each multiuser runlevel.
# Make sure that the script will "exit 0" on success or any other
# value on error.
#
# In order to enable or disable this script just change the execution
# bits.
#
# By default this script does nothing.



su pi -c 'pm2 start /usr/local/src/gateway/index.js --name gateway'
modprobe v4l2loopback video_nr=10,20


# Print the IP address
_IP=$(hostname -I) || true
if [ "$_IP" ]; then
  printf "My IP address is %s\n" "$_IP"
fi

#iptables-restore < /etc/iptables.ipv4.nat

exit 0
