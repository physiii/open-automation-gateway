#!/bin/sh -e
#wget -qO- https://raw.githubusercontent.com/physiii/open-automation-gateway/master/install.sh | bash
#sudo rpi-update

sudo apt update

sudo apt-get install -y curl
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -

sudo apt update
sudo apt upgrade -y

sudo apt-get install -y --force-yes \
  sshpass git nodejs mongodb dnsmasq hostapd tmux xdotool libudev-dev \
  v4l2loopback-dkms v4l2loopback-utils cmake libasound2-dev python-pexpect python-dbus \
  python-setuptools python-dev build-essential libopencv-dev raspberrypi-kernel-headers python-opencv \
  
# sudo ln -s /usr/bin/nodejs /usr/bin/node

sudo easy_install pip
sudo python -m pip install pymongo==3.0.3 numpy imutils # opencv-python
sudo npm install -g pm2

## opencv

#https://www.pyimagesearch.com/2017/09/04/raspbian-stretch-install-opencv-3-python-on-your-raspberry-pi/
#sudo nano /etc/dphys-swapfile
#CONF_SWAPSIZE=1024
#sudo /etc/init.d/dphys-swapfile stop
#sudo /etc/init.d/dphys-swapfile start

sudo apt-get install -y --force-yes \
  libudev-dev cmake python-dbus python-setuptools python-dev build-essential \
  libopencv-dev raspberrypi-kernel-headers python-opencv \
  
cd ~
wget -O opencv.zip https://github.com/Itseez/opencv/archive/3.3.0.zip
unzip opencv.zip
wget -O opencv_contrib.zip https://github.com/Itseez/opencv_contrib/archive/3.3.0.zip
unzip opencv_contrib.zip
cd opencv-3.3.0
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

##opencv from prebuilt binaries
cp -rf build/opencv/include/opencv /usr/include/opencv
cp -rf build/opencv/include/opencv2 /usr/include/opencv2
cp -rf build/opencv/lib/pkgconfig /usr/lib/pkgconfig
cp -rf build/opencv/local/lib/* /usr/local/lib/
cp -rf build/opencv/share/* /usr/share/
cp -rf build/opencv/arm-linux-gnueabihf/* /usr/lib/arm-linux-gnueabihf/

## make and install openzwave
sudo chown -R $USER /usr/local/src
cd /usr/local/src
wget http://old.openzwave.com/downloads/openzwave-1.4.1.tar.gz
tar zxvf openzwave-1.4.1.tar.gz
cd openzwave-1.4.1
make && sudo make install
export LD_LIBRARY_PATH=/usr/local/lib
sudo ldconfig
sudo sed -i '$a LD_LIBRARY_PATH=/usr/local/lib' /etc/environment
sudo ln -s /usr/local/lib64/libopenzwave.so.1.4 /usr/local/lib/

## v4l2loopback
sudo ln -s /lib/modules/4.14.52-v7+ /lib/modules/4.14.50-v7+
sudo chown -R $USER /usr/src
cd /usr/src
git clone https://github.com/umlaeute/v4l2loopback
cd v4l2loopback
make && sudo make install
sudo depmod -a
sudo modprobe v4l2loopback video_nr=10,20

## ffmpeg
# binaries
cd /usr/local/src/gateway/build/ffmpeg
sudo cp ffmpeg /usr/local/bin/ffmpeg
sudo cp libcrypto.so.1.1 libssl.so.1.1 /usr/lib/

# from source
cd /usr/local/src
git clone git://git.videolan.org/x264
cd x264
./configure --host=arm-unknown-linux-gnueabi --enable-static --disable-opencl
make
sudo make install
cd /usr/src
git clone https://github.com/FFmpeg/FFmpeg.git
cd FFmpeg
sudo ./configure --arch=armel --target-os=linux --enable-openssl --enable-gpl --enable-libx264 --enable-nonfree
make -j4
sudo make install

## install open-automation
sudo chmod 777 -R /usr/local/lib
sudo chmod 777 -R /usr/local/src
sudo chmod 777 /etc/wpa_supplicant/wpa_supplicant.conf

cd /usr/local/src/
git clone https://github.com/physiii/open-automation-gateway gateway
ln -s /usr/local/src/gateway ~/gateway
cd gateway
npm install
