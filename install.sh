#!/bin/sh -e

#############
## general ##
#############

curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -

wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
sudo add-apt-repository 'deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse' 

sudo apt update --fix-missing && sudo apt upgrade -y --fix-missing && sudo apt autoremove -y

# Install the MongoDB 4.4 GPG key:

# Add the source location for the MongoDB packages:



sudo apt-get install -y \
  sshpass git nodejs mongodb-org dnsmasq hostapd tmux xdotool libudev-dev \
  python-setuptools python3-dev libssl-dev nmap ffmpeg acl \
  build-essential cmake pkg-config libjpeg-dev libtiff5-dev \
  libavcodec-dev libswscale-dev libv4l-dev libxvidcore-dev libx264-dev libfreetype6-dev \
  libatlas-base-dev gfortran python3-dev libavcodec-dev libavformat-dev python3-pip \
  portaudio19-dev libportaudio2 libportaudiocpp0 \

sudo apt install -y raspberrypi-kernel-headers \

# sudo nano /boot/config.txt
#   over_voltage=2
#   arm_freq=1750
# vcgencmd measure_clock arm
# watch vcgencmd measure_temp

python3 -m pip install numpy imutils pyaudio s-tui
sudo npm install -g pm2

############
## opencv ##
############

# may need to increase swap
# make sure to set it back after
# sudo nano /etc/dphys-swapfile
# sudo /etc/init.d/dphys-swapfile stop
# sudo /etc/init.d/dphys-swapfile start

#sudo mv /usr/lib/python2.7/dist-packages/cv2.arm-linux-gnueabihf.so /usr/lib/python2.7/dist-packages/cv2.arm-linux-gnueabihf-ORIG.so
#sudo ln -s /usr/local/src/opencv-4.0.0/build/lib/cv2.so /usr/lib/python2.7/dist-packages/cv2.arm-linux-gnueabihf.so

cd ${HOME}
wget -O opencv.zip https://github.com/opencv/opencv/archive/4.2.0.zip
wget -O opencv_contrib.zip https://github.com/opencv/opencv_contrib/archive/4.2.0.zip
unzip opencv.zip
unzip opencv_contrib.zip

cd opencv-4.2.0
mkdir build
cd build

cmake -D CMAKE_BUILD_TYPE=RELEASE \
    -D CMAKE_INSTALL_PREFIX=/usr/local \
    -D OPENCV_EXTRA_MODULES_PATH=../../opencv_contrib-4.2.0/modules \
    -D ENABLE_NEON=ON \
    -D ENABLE_VFPV3=ON \
    -D BUILD_TESTS=OFF \
    -D OPENCV_ENABLE_NONFREE=ON \
    -D INSTALL_PYTHON_EXAMPLES=OFF \
    -D BUILD_EXAMPLES=OFF ..

make -j4
sudo make install
sudo ldconfig

## Ubuntu
sudo apt install -y build-essential cmake git pkg-config libgtk-3-dev \
libavcodec-dev libavformat-dev libswscale-dev libv4l-dev \
libxvidcore-dev libx264-dev libjpeg-dev libpng-dev libtiff-dev \
gfortran openexr libatlas-base-dev python3-dev python3-numpy \
libtbb2 libtbb-dev libdc1394-22-dev libopenexr-dev \
libgstreamer-plugins-base1.0-dev libgstreamer1.0-dev

sudo apt install libopencv-dev python3-opencv

#################
##  openzwave  ##
#################

cd /usr/local/src
wget http://old.openzwave.com/downloads/openzwave-1.4.1.tar.gz
tar zxvf openzwave-1.4.1.tar.gz
cd openzwave-1.4.1
make -j4 && sudo make install
export LD_LIBRARY_PATH=/usr/local/lib
sudo ldconfig
sudo sed -i '$a LD_LIBRARY_PATH=/usr/local/lib' /etc/environment
sudo ln -s /usr/local/lib64/libopenzwave.so.1.4 /usr/local/lib/

######################
##  video loopback  ##
######################
#sudo ln -s /lib/modules/4.19.66-v7l+ /lib/modules/4.19.57-v7l+
#sudo ln -s /usr/src/linux-headers-4.14.98-v7+ /lib/modules/4.14.98-v7+/build

sudo chown -R $USER /usr/src
cd /usr/src
git clone https://github.com/umlaeute/v4l2loopback
cd v4l2loopback
sudo make -j4 KERNELRELEASE=`uname -r`
sudo make install KERNELRELEASE=`uname -r`
sudo depmod -a
sudo modprobe v4l2loopback video_nr=20

###############
##  gateway  ##
###############

sudo systemctl unmask hostapd
sudo systemctl enable hostapd
sudo systemctl start hostapd

cd ${HOME}
git clone https://github.com/physiii/open-automation-gateway gateway
cd gateway
npm install
sudo setfacl -m u:pi:rwx /usr/local/lib /etc/wpa_supplicant/wpa_supplicant.conf /etc/hostapd/ /etc/default/hostapd /etc/rc.local /etc/dnsmasq.conf /etc/sysctl.conf
sudo setfacl -m u:pi:rwx /etc

#############
## startup ##
#############

sudo -i
sed -i -e 's/exit 0//g' /etc/rc.local
echo "su pi -c 'pm2 start /home/pi/gateway/index.js --time --name gateway'" >> /etc/rc.local
echo "modprobe snd-aloop enable=1,1,1 index=4,5,6" >> /etc/rc.local
echo "modprobe v4l2loopback video_nr=20" >> /etc/rc.local
echo "exit 0" >> /etc/rc.local
