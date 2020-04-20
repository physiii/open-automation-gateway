#!/bin/sh -e

#############
## general ##
#############

sudo apt update && sudo apt upgrade -y

sudo apt-get install -y curl
curl -sL https://deb.nodesource.com/setup_13.x | sudo -E bash -

sudo apt-get install -y \
  sshpass git nodejs mongodb dnsmasq hostapd tmux xdotool libudev-dev \
  python-pip python-setuptools python3-dev \
  libssl-dev libasound2-dev nmap ffmpeg \
  build-essential cmake pkg-config libjpeg-dev libtiff5-dev \
  libavcodec-dev libavformat-dev libswscale-dev libv4l-dev libxvidcore-dev libx264-dev libfreetype6-dev \
  libatlas-base-dev gfortran python3-dev libavcodec-dev libavformat-dev libqtgui4 libqt4-test python3-pip \
  libasound-dev portaudio19-dev libportaudio2 libportaudiocpp0 python-pyaudio \
  raspberrypi-kernel-headers libjasper-dev \

 # sudo apt install -y v4l2loopback-dkms v4l2loopback-utils

sudo pip3 install pymongo==3.0.3 numpy imutils pyaudio s-tui
sudo npm install -g pm2

##############
##  ffmpeg  ##
##############

cd ${HOME}
git clone https://github.com/FFmpeg/FFmpeg.git
cd FFmpeg
sudo ./configure --arch=armel --target-os=linux --enable-libfreetype --enable-openssl --enable-gpl --enable-libx264 --enable-nonfree
make -j4
sudo make install

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

##############
##  camera  ##
##############

sudo systemctl unmask hostapd
sudo systemctl enable hostapd
sudo systemctl start hostapd

cd ${HOME}
git clone https://github.com/physiii/camera
cd camera
npm install
sudo chmod -R 777 /usr/local/lib /etc/wpa_supplicant/wpa_supplicant.conf /etc/hostapd/hostapd.conf /etc/default/hostapd /etc/rc.local /etc/dnsmasq.conf /etc/sysctl.conf

#############
## startup ##
#############

sudo -i
sed -i -e 's/exit 0//g' /etc/rc.local
echo "su pi -c 'pm2 start /home/pi/camera/index.js --name camera'" >> /etc/rc.local
echo "modprobe snd-aloop enable=1,1,1 index=4,5,6" >> /etc/rc.local
echo "modprobe v4l2loopback video_nr=20" >> /etc/rc.local
echo "exit 0" >> /etc/rc.local
