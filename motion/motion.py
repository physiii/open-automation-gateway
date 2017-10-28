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
from subprocess import call
from ffmpy import FFmpeg


# construct the argument parser and parse the arguments
ap = argparse.ArgumentParser()
ap.add_argument("-c", "--conf", required=True,
	help="path to the JSON configuration file")
args = vars(ap.parse_args())

# filter warnings, load the configuration and initialize the Dropbox
# client
warnings.filterwarnings("ignore")
conf = json.load(open(args["conf"]))
client = None
avg = None
lastUploaded = datetime.datetime.now()
motionCounter = 0
#camera = PiCamera()
#camera.resolution = (640, 480)
#camera.framerate = 10
#rawCapture = PiRGBArray(camera, size=(640, 480))
#out = cv2.VideoWriter('output.avi', -1, 20.0, (640,480))
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
print("[INFO] warming up...")
vs = VideoStream(usePiCamera=conf["picamera"] > 0,resolution=(800,600),framerate=10).start()
time.sleep(conf["camera_warmup_time"])
if os.path.exists('temp'):
	shutil.rmtree("temp")
# capture frames from the camera
#for f in camera.capture_continuous(rawCapture, format="bgr", use_video_port=True):
while True:
	# grab the raw NumPy array representing the image, then initialize the timestamp
	# and occupied/unoccupied text
	frame = vs.read()
	#frame = f.array
	timestamp = datetime.datetime.now()
	month = timestamp.strftime("%B")
	day = timestamp.strftime("%d")
	hour = timestamp.strftime("%I:%M%p")
	text = ""
	#out.write(image)
	# show the frame
	# cv2.imshow("Frame", image)
	# key = cv2.waitKey(1) & 0xFF
	gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
	gray = cv2.GaussianBlur(gray, (21, 21), 0)

	# if the average frame is None, initialize it
	if avg is None:
		print("[INFO] starting background model...")
		avg = gray.copy().astype("float")
		#rawCapture.truncate(0)
		continue

	cv2.accumulateWeighted(gray, avg, 0.5)
	frameDelta = cv2.absdiff(gray, cv2.convertScaleAbs(avg))

	# threshold the delta image, dilate the thresholded image to fill
	# in holes, then find contours on thresholded image
	thresh = cv2.threshold(frameDelta, conf["delta_thresh"], 255,
		cv2.THRESH_BINARY)[1]
	thresh = cv2.dilate(thresh, None, iterations=2)
	cnts = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL,
		cv2.CHAIN_APPROX_SIMPLE)
	cnts = cnts[0] if imutils.is_cv2() else cnts[1]
 
	# loop over the contours
	for c in cnts:
		motion_detected = None
		if cv2.contourArea(c) < conf["min_area"]:
			continue
		# compute the bounding box for the contour, draw it on the frame,
		# and update the text
		x, y, w, h = cv2.boundingRect(c)
		cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
		#print("x:",x)
		if x > max_height:
			continue
		text = "Motion"
		motion_detected = 1
 
	# draw the text and timestamp on the frame
	ts = timestamp.strftime("%A %d %B %Y %I:%M:%S%p")
	cv2.putText(frame, "{}".format(text), (10, 20),
		cv2.FONT_HERSHEY_SIMPLEX, 0.85, (0, 0, 255), 2)
	cv2.putText(frame, ts, (10, frame.shape[0] - 10), 
		cv2.FONT_HERSHEY_SIMPLEX,0.65, (0, 0, 255), 2)

	# clear the stream in preparation for the next frame
	#rawCapture.truncate(0)

	if preloaded is None:
		if not os.path.exists('temp'):
			os.mkdir('temp')
		image_count = preload_count
		file = "temp/"+str(image_count)+".png"
		if preload_count > preload:
			preload_count = 0
			preloaded = 1
			continue
		print("Preloading...",file);
		cv2.imwrite(file,frame)
		preload_count += 1
		continue

	if motion_detected:
		file = "temp/"+str(image_count)+".png"
		print("{ message:\"Motion detected!\" file:\""+file+"\"");
		cv2.imwrite(file,frame)
		image_count += 1
		postloaded = None
	else:
		if postloaded is None:
			file = "temp/"+str(image_count)+".png"
			cv2.imwrite(file,frame)
			image_count += 1
			postload_count += 1
			if postload_count > postload:
				if not os.path.exists('events'):
					os.mkdir('events')

				if not os.path.exists('events/'+month):
					os.mkdir('events/'+month)

				if not os.path.exists('events/'+month+"/"+day):
					os.mkdir('events/'+month+"/"+day)

				video_file = "events/"+month+"/"+day+"/"+hour+".mp4"
				call(["ffmpeg","-r","3","-f","image2","-s","800x600","-i","temp/%d.png","-vcodec","libx264","-crf","3","-pix_fmt","yuv420p",video_file,"-y"])
				#ffmpeg -r 2 -f image2 -s 640x480 -i temp/%d.png -vcodec libx264 -crf 25  -pix_fmt yuv420p test.mp4
				print("{ motion_video:\""+video_file+"\" }");
				time.sleep(1)
				shutil.rmtree("temp")
				postloaded = 1
				preloaded = None
				postload_count = 0
				continue
				

		for i in range(1,preload):
			old_img = "temp/"+str(i)+".png"
			new_img = "temp/"+str(i - 1)+".png"
			#print("renaming",old_img,"to",new_img)
			os.rename(old_img, new_img)
		file = "temp/"+str(preload-1)+".png"
		cv2.imwrite(file,frame)
	frame_count += 1
