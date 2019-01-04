#!/bin/sh -e

# wget -qO- https://raw.githubusercontent.com/physiii/open-automation-gateway/master/install.sh | bash
# sudo apt update
# sudo apt upgrade -y
# sudo rpi-update

#############
## general ##
#############

sudo chmod -R 777 /usr/local/lib /usr/local/src

sudo apt install -y curl
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash - 

sudo apt-get install -y --force-yes \
  sshpass git nodejs mongodb dnsmasq hostapd tmux libudev-dev \
  v4l2loopback-dkms v4l2loopback-utils libasound2-dev python-pip libssl-dev \
  python-setuptools python-dev build-essential libopencv-dev python-opencv \

wget https://bootstrap.pypa.io/get-pip.py
sudo python get-pip.py
sudo pip install pymongo==3.0.3 numpy imutils

############
## opencv ##
############

sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential cmake pkg-config libjpeg-dev libtiff5-dev libjasper-dev libpng12-dev \
    libavcodec-dev libavformat-dev libswscale-dev libv4l-dev libxvidcore-dev libx264-dev \
    libatlas-base-dev gfortran python2.7-dev python3-dev libavcodec-dev libavformat-dev
    
cd ~
wget -O opencv.zip https://github.com/Itseez/opencv/archive/3.3.0.zip
wget -O opencv_contrib.zip https://github.com/Itseez/opencv_contrib/archive/3.3.0.zip
unzip opencv.zip
unzip opencv_contrib.zip

cd ~/opencv-3.3.0/
mkdir build
cd build

cmake -D CMAKE_BUILD_TYPE=RELEASE \
	-D CMAKE_INSTALL_PREFIX=/usr/local \
	-D BUILD_WITH_DEBUG_INFO=OFF \
	-D BUILD_DOCS=OFF \
	-D BUILD_EXAMPLES=OFF \
	-D BUILD_TESTS=OFF \
	-D BUILD_opencv_ts=OFF \
	-D BUILD_PERF_TESTS=OFF \
	-D INSTALL_C_EXAMPLES=OFF \
	-D INSTALL_PYTHON_EXAMPLES=OFF \
	-D OPENCV_EXTRA_MODULES_PATH=../../opencv_contrib-3.3.0/modules \
	-D ENABLE_NEON=ON \
	-D WITH_LIBV4L=ON \
	-D WITH_FFMPEG=OFF \
../

make -j4
sudo make install
sudo ldconfig

#################
##  openzwave  ##
#################

cd /usr/local/src
wget http://old.openzwave.com/downloads/openzwave-1.4.1.tar.gz
tar zxvf openzwave-1.4.1.tar.gz
cd openzwave-1.4.1
make && sudo make install
export LD_LIBRARY_PATH=/usr/local/lib
sudo ldconfig
sudo sed -i '$a LD_LIBRARY_PATH=/usr/local/lib' /etc/environment
sudo ln -s /usr/local/lib64/libopenzwave.so.1.4 /usr/local/lib/

######################
##  video loopback  ##
######################

sudo ln -s /usr/src/linux-headers-4.14.52-v7+ /lib/modules/4.14.79-v7+/build
sudo chown -R $USER /usr/src
cd /usr/src
git clone https://github.com/umlaeute/v4l2loopback
cd v4l2loopback
make && sudo make install
sudo depmod -a
sudo modprobe v4l2loopback video_nr=10,20

##############
##  ffmpeg  ##
##############

cd /usr/local/src
git clone git://git.videolan.org/x264
cd x264
./configure --host=arm-unknown-linux-gnueabi --enable-static --disable-opencl
make -j4
sudo make install

cd /usr/local/src
git clone https://github.com/FFmpeg/FFmpeg.git
cd FFmpeg
sudo ./configure --arch=armel --target-os=linux --enable-openssl --enable-gpl --enable-libx264 --enable-nonfree
make -j4
sudo make install

###############
##  gateway  ##
###############

export OPENCV4NODEJS_DISABLE_AUTOBUILD=1
cd /usr/local/src
git clone https://github.com/physiii/open-automation-gateway gateway
cd gateway
sudo npm install -g pm2 openzwave-shared
npm install

#############
## startup ##
#############

sudo -i
sed -i -e 's/exit 0//g' /etc/rc.local
echo "su pi -c 'pm2 start /usr/local/src/gateway/index.js --name gateway'" >> /etc/rc.local
echo "modprobe v4l2loopback video_nr=10,20" >> /etc/rc.local
echo "exit 0" >> /etc/rc.local
