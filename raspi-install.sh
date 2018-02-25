#!/bin/sh -e
#wget -qO- https://raw.githubusercontent.com/physiii/open-automation-gateway/master/install.sh | bash

## set up environment

sudo apt update
sudo apt upgrade -y
#sudo rpi-update

sudo apt-get install -y curl
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -

sudo apt-get install -y --force-yes \
  sshpass git nodejs mongodb dnsmasq hostapd tmux xdotool libudev-dev \
  v4l2loopback-dkms v4l2loopback-utils \
  python-setuptools python-dev build-essential libopencv-dev python-opencv raspberrypi-kernel-headers \
  
sudo ln -s /usr/bin/nodejs /usr/bin/node

sudo easy_install pip
sudo python -m pip install pymongo numpy imutils opencv-python
sudo npm install -g pm2 openzwave-shared

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
npm install
