echo ==== $(date +%H:%M) ====
image_file="$1"
device="$2"

sudo dd bs=1M if=${image_file} | pv | sudo dd bs=1M of=$device
#play /home/physiii/sound.ogg
notify-send -u normal "Done writing image to drive"
echo ==== $(date +%H:%M) ====
