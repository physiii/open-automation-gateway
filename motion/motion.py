from imutils.video import VideoStream
import argparse
import warnings
import datetime
#import dropbox
import imutils
import json
import time
import cv2
import os
import shutil
import sys

from bson import BSON
from bson import json_util
from subprocess import call
from pymongo import MongoClient
from pprint import pprint
from bson.objectid import ObjectId

#client = MongoClient("127.0.0.1")
#db = client.gateway
#devices = db.devices.find()
#for device in devices:
#	print(device)

# construct the argument parser and parse the arguments
# ap = argparse.ArgumentParser()
# ap.add_argument("-c", "--conf", required=False,
#	help="path to the JSON configuration file")

class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        return json.JSONEncoder.default(self, o)

print("starting motion.py...")
sys.stdout.flush()
device_list = []

try:
  connection = MongoClient('mongodb://localhost:27017')
  db = connection.gateway
except:
  print('Error: Unable to Connect')
  sys.stdout.flush()
  connection = None

vs = []
if connection is not None:
  devices = db.devices.find()
  i=0
  for device in devices:
    device_obj = db.devices.find_one(device)
    print("dev = "+device_obj['dev'])
    sys.stdout.flush()
    if 'dev' not in device_obj: continue
    if device_obj['dev'].find("/dev/video20") < 0: continue
    print("loading " + device_obj['dev'])
    vs.append(VideoStream(src=device_obj["dev"],usePiCamera=0,resolution=[800,600],framerate=5).start());
    print("loaded " + device_obj['dev'])
    sys.stdout.flush()
    i=i+1
    

warnings.filterwarnings("ignore")
client = None
avg = None
motionCounter = 0
frame_count = 0
motion_detected = None
preloaded = None
image_count = 0
preload = 10
preload_count = 0
postloaded = 1
postload = 10
postload_count = 0
max_height = 500
last_motion_event = datetime.datetime.now()
motion_off_delay = 5
frame_delta = 100 #200ms = 5 fps
last_frame = 0

dir_path = os.path.dirname(os.path.realpath(__file__))
print dir_path
sys.stdout.flush()

print("[INFO] warming up...")
sys.stdout.flush()

#vs = VideoStream(src=conf["device"],usePiCamera=conf["picamera"] > 0,resolution=conf["resolution"],framerate=conf["fps"]).start()
time.sleep(2.5)
if os.path.exists(dir_path+'/temp'):
	shutil.rmtree(dir_path+'/temp')
# capture frames from the camera
#for f in camera.capture_continuous(rawCapture, format="bgr", use_video_port=True):
while True:
	# grab the raw NumPy array representing the image, then initialize the timestamp
	# and occupied/unoccupied text
	frame = vs[0].read()
	timestamp = datetime.datetime.now()
	month = timestamp.strftime("%B")
	day = timestamp.strftime("%d")
	hour = timestamp.strftime("%I:%M%p")
	text = ""

	if preloaded is None:
		if not os.path.exists(dir_path+'/temp'):
			os.mkdir(dir_path+'/temp')
		if preload_count > preload:
			preload_count = 0
			preloaded = 1
			continue
		file = dir_path+'/temp/'+str(image_count)+".png"
		print("Preloading...",file)
  		sys.stdout.flush()
		cv2.imwrite(file,frame)
		preload_count += 1
		image_count = preload_count
		continue

	for i in range(1,preload+1):
		old_img = dir_path+'/temp/'+str(i)+".png"
		new_img = dir_path+'/temp/'+str(i - 1)+".png"
		#print "renaming "+old_img+" to "+new_img
		os.rename(old_img, new_img)

	file = dir_path+'/temp/'+str(preload)+".png"
	cv2.imwrite(file,frame)

	gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
	gray = cv2.GaussianBlur(gray, (21, 21), 0)

	if avg is None:
		print("[INFO] starting background model...")
  		sys.stdout.flush()
		avg = gray.copy().astype("float")
		#rawCapture.truncate(0)
		continue

	cv2.accumulateWeighted(gray, avg, 0.5)
	frameDelta = cv2.absdiff(gray, cv2.convertScaleAbs(avg))

	# threshold the delta image, dilate the thresholded image to fill
	# in holes, then find contours on thresholded image
	thresh = cv2.threshold(frameDelta, 5, 255,
		cv2.THRESH_BINARY)[1]
	thresh = cv2.dilate(thresh, None, iterations=2)
	cnts = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL,
		cv2.CHAIN_APPROX_SIMPLE)
	cnts = cnts[0] if imutils.is_cv2() else cnts[1]
 
	# loop over the contours
	for c in cnts:
		last_motion_event_delta = datetime.datetime.now() - last_motion_event
		if last_motion_event_delta.total_seconds() > motion_off_delay:
			print("[NO MOTION] no motion detected!")
			motion_detected = None
		if cv2.contourArea(c) < 5000:
			continue
		# compute the bounding box for the contour, draw it on the frame,
		# and update the text
		x, y, w, h = cv2.boundingRect(c)
		cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
		#print("x:",x)
		if x > max_height: continue
		text = "Motion"
		last_motion_event = datetime.datetime.now()
		motion_detected = 1
 
	# draw the text and timestamp on the frame
	ts = timestamp.strftime("%A %d %B %Y %I:%M:%S%p")
	cv2.putText(frame, "{}".format(text), (10, 20),
		cv2.FONT_HERSHEY_SIMPLEX, 0.85, (0, 0, 255), 2)
	cv2.putText(frame, ts, (10, frame.shape[0] - 10), 
		cv2.FONT_HERSHEY_SIMPLEX,0.65, (0, 0, 255), 2)

	# clear the stream in preparation for the next frame
	#rawCapture.truncate(0)

	if motion_detected:
		file = dir_path+'/temp/'+str(image_count)+".png"
		current_frame = int(round(time.time() * 1000))
		if frame_delta < current_frame - last_frame:
			last_frame = int(round(time.time() * 1000))
			cv2.imwrite(file,frame)
			print("[MOTION]{ topic: \"motion detected\", message:\"Motion detected!\", file:\""+file+"\" }")
			sys.stdout.flush()
		else: continue

		cv2.imwrite(file,frame)
		if not os.path.exists(dir_path+'/events'):
			os.mkdir(dir_path+'/events')
		preview_image = dir_path+'/preview.jpg'
		cv2.imwrite(preview_image,frame)
		image_count += 1
		postloaded = None
	else:
		if postloaded is None:
			file = dir_path+'/temp/'+str(image_count)+".png"
			cv2.imwrite(file,frame)
			image_count += 1
			postload_count += 1
			if postload_count > postload:
				if not os.path.exists(dir_path+'/events/'+month):
					os.mkdir(dir_path+'/events/'+month)

				if not os.path.exists(dir_path+'/events/'+month+"/"+day):
					os.mkdir(dir_path+'/events/'+month+"/"+day)

				video_file = dir_path+'/events/'+month+"/"+day+"/"+hour+".avi";
				video_res = str(800)+"x"+str(600);
				print "video_res "+video_res;
				sys.stdout.flush()
				call(["ffmpeg","-y","-r","1","-f","image2","-s",video_res,"-i",dir_path+"/temp/%d.png",video_file])
				#ffmpeg -y -r 3 -f image2 -s 800x600 -i temp/%d.png test.avi
				print("{ motion_video:\""+video_file+"\" }");
				sys.stdout.flush()
				time.sleep(1)
				shutil.rmtree(dir_path+'/temp')
				postloaded = 1
				preloaded = None
				postload_count = 0
				continue
				
	frame_count += 1
