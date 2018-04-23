# USAGE
# python motion2.py --output output

##################################################################################################################
# import the necessary packages
from keyevent.keyclipwriter import KeyClipWriter
from imutils.video import VideoStream
import argparse
import warnings
import datetime
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

##################################################################################################################
# Definitions and Classes

def percentage(percent, wholeNum):
    if wholeNum == 0:
         print("Bad value for max number")
    elif percent >= wholeNum:
         print("Percentage will return greater than a 100 percent value")
    else:
        percent = float(percent)
        wholeNum = float(wholeNum)
        return (percent * wholeNum) / 100.0

class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        return json.JSONEncoder.default(self, o)


##################################################################################################################
#Start MongoDB and check for device connections

print("starting motion.py...")
sys.stdout.flush()
device_list = []

try:
  connection = MongoClient('mongodb://localhost:27017')
  print("Mongodb connected")
  db = connection.gateway
except:
  print('Error: Unable to Connect')
  sys.stdout.flush()
  connection = None


if connection is not None:
  devices = db.devices.find()
  sys.stdout.flush()
  for device in devices:
    device_obj = db.devices.find_one(device)
    if device_obj is None: continue
    if 'dev' not in device_obj: continue
    print("dev = "+device_obj['dev'])
    if device_obj['dev'].find("/dev/video20") < 0: continue
    for key, value in device_obj['resolution'].iteritems():
      if key == 'width':
        total_width = value
      if key == 'height':
        total_height = value
    print("loading " + device_obj['dev'])
    print("loaded " + device_obj['dev'])
    main_cam = device_obj['dev']
    sys.stdout.flush()

##################################################################################################################

# construct the argument parse and parse the arguments

dir_path = os.path.dirname(os.path.realpath(__file__))
r_height = 500
r_width = 850
xmin = 0
ymin = 200
region_detect = True
xmax = xmin + r_width
ymax = ymin + r_height
avg = None

##################################################################################################################

# initialize the video stream and allow the camera sensor to
# warmup
print("[INFO] warming up camera...")
camera = VideoStream(src=main_cam, resolution=(total_width, total_height), framerate=10).start()
time.sleep(2.5)

# initialize key clip writer and the consecutive number of
# frames that have *not* contained any action
bufSize = 180
kcw = KeyClipWriter(bufSize)
consecFrames = 0
lastUploaded = datetime.datetime.now()
firstFrame = None
motionCounter = 0

# keep looping
while True:
	# grab the current frame, resize it, and initialize a
	# boolean used to indicate if the consecutive frames
	# counter should be updated
	frame = camera.read()
	text = ""
	updateConsecFrames = True

	timestamp = datetime.datetime.now()
	month = timestamp.strftime("%B")
	day = timestamp.strftime("%d")
	hour = timestamp.strftime("%I:%M%p")

	# resize the frame, convert it to grayscale, and blur it
	frame = imutils.resize(frame, width=600)
	#print("frames:", frame.shape[1], frame.shape[0])
	gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
	gray = cv2.GaussianBlur(gray, (21, 21), 0)


	# if the first frame is None, initialize it

	if avg is None:
		print("[INFO] starting background model...")
  		sys.stdout.flush()
		avg = gray.copy().astype("float")
		continue

	# accumulate the weighted average between the current frame and
	# previous frames, then compute the difference between the current
	# frame and running average
	cv2.accumulateWeighted(gray, avg, 0.4)
	frameDelta = cv2.absdiff(gray, cv2.convertScaleAbs(avg))
	thresh = cv2.threshold(frameDelta, 25, 255, cv2.THRESH_BINARY)[1]

	# dilate the thresholded image to fill in holes, then find contours
	# on thresholded image
	thresh = cv2.dilate(thresh, None, iterations=2)
	im2, cnts, heir = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL,
		cv2.CHAIN_APPROX_SIMPLE)

	# Draw region detection area
	if region_detect:
		cv2.rectangle(frame, (xmin, ymin), (xmax, ymax), (0, 0, 255), 2)

	# only proceed if at least one contour was found
	for c in cnts:
		# if the contour is too small, ignore it
		if cv2.contourArea(c) < 5000:
			continue

		# compute the bounding box for the contour, draw it on the frame,
		# and update the text
		(x, y, w, h) = cv2.boundingRect(c)
		cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

        #if starting time < time > ending time:
		if region_detect:
			if y < ymax and x < xmax and x+w > xmin and y+h > ymin:
				text = "[MOTION]"
		else:
			text = "[MOTION]"





			# if we are not already recording, start recording

	cv2.putText(frame, "{}".format(text), (10, 20),
		cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
	cv2.putText(frame, datetime.datetime.now().strftime("%A %d %B %Y %I:%M:%S%p"),
		(10, frame.shape[0] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 255), 1)

	if text == "[MOTION]":
		if (timestamp - lastUploaded).seconds >= 1.0:
			motionCounter += 1

		if motionCounter >= 5:


			FPS = 10
			consecFrames = 0
			fourcc = cv2.VideoWriter_fourcc(*'MJPG')

			if not os.path.exists(dir_path+'/events/'+month):
				os.mkdir(dir_path+'/events/'+month)

			if not os.path.exists(dir_path+'/events/'+month+"/"+day):
				os.mkdir(dir_path+'/events/'+month+"/"+day)

			#output = dir_path+'/events/'+month+"/"+day

			if not kcw.recording:
				print("[MOTION] Detected!")
                preview_image = dir_path+'/preview.jpg'
    			cv2.imwrite(preview_image,frame)
				print("Starting video")

				p = "{}/{}.avi".format((dir_path+'/events/'+month+"/"+day),
					month+"_"+day+"_"+hour)

				kcw.start(p, fourcc, FPS)

	if updateConsecFrames:
		consecFrames += 1

	if consecFrames >=  (bufSize + 10):
		consecFrames = 0

	kcw.update(frame)

	if kcw.recording and consecFrames >= bufSize:
		print("Video Finished Capturing")
		kcw.finish()

	#cv2.imshow("Security Feed", frame)
	#cv2.imshow("Thresh Feed", thresh)
	#key = cv2.waitKey(1) & 0xFF

	#if the `q` key was pressed, break from the loop
	#if key == ord("q"):
	#	break

# if we are in the middle of recording a clip, wrap it up
#if kcw.recording:
	#kcw.finish()

# do a bit of cleanup
#camera.release()
#cv2.destroyAllWindows()
