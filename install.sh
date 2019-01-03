#!/bin/sh -e
#wget -qO- https://raw.githubusercontent.com/physiii/open-automation-gateway/master/install.sh | bash

# sudo apt update
# sudo apt upgrade -y
# sudo rpi-update


############
## opencv ##
############

sudo apt-get update && sudo apt-get upgrade
sudo apt-get install -y build-essential cmake pkg-config
sudo apt-get install -y libjpeg-dev libtiff5-dev libjasper-dev libpng12-dev
sudo apt-get install -y libavcodec-dev libavformat-dev libswscale-dev libv4l-dev
sudo apt-get install -y libxvidcore-dev libx264-dev
sudo apt-get install -y libgtk2.0-dev libgtk-3-dev
sudo apt-get install -y libatlas-base-dev gfortran
sudo apt-get install -y python2.7-dev python3-dev

sudo apt install -y libavcodec-dev libavformat-dev libswscale-dev libv4l-dev libxvidcore-dev libx264-dev libgtk2.0-dev libgtk-3-dev libatlas-base-dev gfortran python2.7-dev python3-dev

cd ~
wget -O opencv.zip https://github.com/Itseez/opencv/archive/3.3.0.zip
unzip opencv.zip

wget -O opencv_contrib.zip https://github.com/Itseez/opencv_contrib/archive/3.3.0.zip
unzip opencv_contrib.zip

wget https://bootstrap.pypa.io/get-pip.py
sudo python get-pip.py

pip install numpy

cd ~/opencv-3.3.0/
mkdir build
cd build
cmake -D CMAKE_BUILD_TYPE=RELEASE \
    -D CMAKE_INSTALL_PREFIX=/usr/local \
    -D INSTALL_PYTHON_EXAMPLES=ON \
    -D OPENCV_EXTRA_MODULES_PATH=~/opencv_contrib-3.3.0/modules \
    -D BUILD_EXAMPLES=ON ..
 
make -j4
sudo make install
sudo ldconfig

############
##  node  ##
############

sudo apt-get install -y curl
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash - 

sudo apt-get install -y --force-yes \
  sshpass git nodejs mongodb dnsmasq hostapd tmux xdotool libudev-dev \
  v4l2loopback-dkms v4l2loopback-utils libasound2-dev ython-pip \
  python-setuptools python-dev build-essential libopencv-dev python-opencv \
#  speedtest-cli gstreamer1.0  nmap  lua5.2 bc g++ pkg-config \
#  libjpeg-dev libavformat-dev libavcodec-dev \
#  libavutil-dev libncurses5-dev \
#  libc6-dev zlib1g-dev libpq5 libpq-dev raspberrypi-kernel-headers \ \
# sudo ln -s /usr/bin/nodejs /usr/bin/node

sudo easy_install pip
sudo python -m pip install pymongo==3.0.3 numpy imutils opencv-python

## make and install openzwave
cd /usr/local/src
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
sudo modprobe v4l2loopback video_nr=10,11,12,13,14

## ffmpeg
cd /usr/local/src
git clone git://git.videolan.org/x264
cd x264
./configure --host=arm-unknown-linux-gnueabi --enable-static --disable-opencl
make
sudo make install
cd /usr/local/src
git clone https://github.com/FFmpeg/FFmpeg.git
cd FFmpeg
sudo ./configure --arch=armel --target-os=linux --enable-openssl --enable-gpl --enable-libx264 --enable-nonfree
make -j4
sudo make install

## install open-automation
cd /usr/local/src
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
