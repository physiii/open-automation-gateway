#!/bin/sh -e
#wget -qO- https://raw.githubusercontent.com/physiii/open-automation-gateway/master/install.sh | bash

# sudo apt update
# sudo apt upgrade -y
# sudo rpi-update

sudo apt-get install -y curl
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -

sudo apt-get install -y --force-yes \
  sshpass git nodejs mongodb dnsmasq hostapd tmux xdotool libudev-dev \
  v4l2loopback-dkms v4l2loopback-utils \
  python-setuptools python-dev build-essential libopencv-dev python-opencv raspberrypi-kernel-headers \
#  speedtest-cli gstreamer1.0  nmap  lua5.2 bc g++ pkg-config \
#  libjpeg-dev libavformat-dev libavcodec-dev \
#  libavutil-dev libncurses5-dev \
#  libc6-dev zlib1g-dev libpq5 libpq-dev \
sudo ln -s /usr/bin/nodejs /usr/bin/node

sudo easy_install pip
sudo python -m pip install pymongo numpy imutils opencv-python

## make and install openzwave
cd /usr/src
wget http://old.openzwave.com/downloads/openzwave-1.4.1.tar.gz
tar zxvf openzwave-1.4.1.tar.gz
cd openzwave-1.4.1
make && sudo make install
export LD_LIBRARY_PATH=/usr/local/lib
sudo ldconfig
sudo sed -i '$a LD_LIBRARY_PATH=/usr/local/lib' /etc/environment
sudo ln -s /usr/local/lib64/libopenzwave.so.1.4 /usr/local/lib/

## (old) create loop back devices for video
# sudo wget https://raw.githubusercontent.com/notro/rpi-source/master/rpi-source -O /usr/bin/rpi-source
# sudo chmod +x /usr/bin/rpi-source
# /usr/bin/rpi-source -q --tag-update
# rpi-source

## v4l2loopback
sudo chown -R $USER /usr/src
cd /usr/src
git clone https://github.com/umlaeute/v4l2loopback
cd v4l2loopback
make && sudo make install
sudo depmod -a
sudo modprobe v4l2loopback video_nr=10,20

## ffmpeg
cd /usr/src
git clone git://git.videolan.org/x264
cd x264
./configure --host=arm-unknown-linux-gnueabi --enable-static --disable-opencl
make
sudo make install
cd /usr/src
git clone https://github.com/FFmpeg/FFmpeg.git
cd FFmpeg
sudo ./configure --arch=armel --target-os=linux --enable-gpl --enable-libx264 --enable-nonfree
make
sudo make install

## install open-automation
cd ~
git clone https://github.com/physiii/open-automation-gateway gateway
cd gateway
sudo npm install -g pm2 openzwave-shared
npm install

## copy files and set permissions
#sudo cp files/motion.conf /etc/motion/motion.conf
#sudo cp files/thread1.conf /etc/motion/thread1.conf
#sudo cp files/thread2.conf /etc/motion/thread2.conf
#sudo cp files/default.motion /etc/default/motion
#sudo service motion restart
#sudo chown -R $USER /var/log /var/lib/motion /etc/motion
#sudo chmod -R 777 /var/log /var/lib
