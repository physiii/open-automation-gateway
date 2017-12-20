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

dir_path = os.path.dirname(os.path.realpath(__file__))
print dir_path

max_height = 500
print("[INFO] warming up...")
vs = VideoStream(src=conf["device"],usePiCamera=conf["picamera"] > 0,resolution=conf["resolution"],framerate=conf["fps"]).start()
time.sleep(conf["camera_warmup_time"])
if os.path.exists(dir_path+'/temp'):
	shutil.rmtree(dir_path+'/temp')
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

	if preloaded is None:
		if not os.path.exists(dir_path+'/temp'):
			os.mkdir(dir_path+'/temp')
		if preload_count > preload:
			preload_count = 0
			preloaded = 1
			continue
		file = dir_path+'/temp/'+str(image_count)+".png"
		print("Preloading...",file)
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

	if motion_detected:
		file = dir_path+'/temp/'+str(image_count)+".png"
		print("{ message:\"Motion detected!\" file:\""+file+"\"")
		cv2.imwrite(file,frame)
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
				if not os.path.exists(dir_path+'/events'):
					os.mkdir(dir_path+'/events')

				if not os.path.exists(dir_path+'/events/'+month):
					os.mkdir(dir_path+'/events/'+month)

				if not os.path.exists(dir_path+'/events/'+month+"/"+day):
					os.mkdir(dir_path+'/events/'+month+"/"+day)

				video_file = dir_path+'/events/'+month+"/"+day+"/"+hour+".avi";
				video_res = str(conf["resolution"][0])+"x"+str(conf["resolution"][1]);
				print "video_res "+video_res;
				call(["ffmpeg","-y","-r","3","-f","image2","-s",video_res,"-i",dir_path+"/temp/%d.png",video_file])
				#ffmpeg -y -r 3 -f image2 -s 800x600 -i temp/%d.png test.avi
				print("{ motion_video:\""+video_file+"\" }");
				time.sleep(1)
				shutil.rmtree(dir_path+'/temp')
				postloaded = 1
				preloaded = None
				postload_count = 0
				continue
				
	frame_count += 1
