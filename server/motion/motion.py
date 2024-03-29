# USAGE
# python3 motion.py --output output

##################################################################################################################
# import the necessary packages
from keyevent.keyclipwriter import KeyClipWriter
from keyevent.audioclipwriter import AudioClipWriter
from imutils.video import VideoStream
import argparse
import warnings
import datetime
import time
import imutils
import json
import cv2
import pyaudio
import os
import shutil
import sys
import uuid
import wave
import os
import subprocess
from subprocess import  check_output, CalledProcessError, STDOUT

# from bson import BSON
# from bson import json_util
from subprocess import call
from pprint import pprint
# from bson.objectid import ObjectId

##################################################################################################################
# Parse arguments

ap = argparse.ArgumentParser()
ap.add_argument('-a', '--audio-device', dest='audio-device', type=str, required=True, help='path to video device interface (e.g. hw:7,1)')
ap.add_argument('-c', '--camera', dest='camera', type=str, required=True, help='path to video device interface (e.g. /dev/video0)')
ap.add_argument('-i', '--camera-id', dest='camera-id', type=str, required=True, help='unique id of camera service')
ap.add_argument('-r', '--rotation', dest='rotation', type=int, required=False, default=0, help='degrees of rotation for the picture - supported values: 0, 180')
ap.add_argument('-f', '--frame-rate', dest='frame-rate', type=int, required=False, default=3, help='Video frame rate')
ap.add_argument('-t', '--threshold', dest='threshold', type=int, required=False, default=4, help='Threshold used to begin recording motion')
ap.add_argument('-x1', '--motionArea_x1', dest='motionArea_x1', type=float, required=False, default=0, help='Coordinates for motion record region')
ap.add_argument('-y1', '--motionArea_y1', dest='motionArea_y1', type=float, required=False, default=0, help='Coordinates for motion record region')
ap.add_argument('-x2', '--motionArea_x2', dest='motionArea_x2', type=float, required=False, default=0, help='Coordinates for motion record region')
ap.add_argument('-y2', '--motionArea_y2', dest='motionArea_y2', type=float, required=False, default=0, help='Coordinates for motion record region')
args = vars(ap.parse_args())

cameraPath = args['camera']
cameraId = args['camera-id']
cameraRotation = args['rotation']
motionThreshold = args['threshold']
frameRate = args['frame-rate']
motionArea_x1 = args['motionArea_x1']
motionArea_y1 = args['motionArea_y1']
motionArea_x2 = args['motionArea_x2']
motionArea_y2 = args['motionArea_y2']
audioDevice = args['audio-device']

##################################################################################################################
# Globals

rHeight = 200
rWidth = 300
xmin = 0
ymin = 100
xmax = xmin + rWidth
ymax = ymin + rHeight

MIN_CONTOUR_AREA = 0
BUFFER_TIME = 1
AUDIO_FRAMERATE = 6
BUFFER_SIZE = BUFFER_TIME * frameRate # seconds * frameRate
AUDIO_BUFFER_SIZE = BUFFER_TIME * AUDIO_FRAMERATE # seconds * framerate
MIN_MOTION_FRAMES = 15 # minimum number of consecutive frames with motion required to trigger motion detection
MAX_CATCH_UP_FRAMES = 30 # maximum number of consecutive catch-up frames before forcing evaluation of a new frame
MAX_CATCH_UP_MAX_REACHED = 10 # script will exit if max catch up frames limit is reached this many times consecutively

##################################################################################################################
# Definitions and Classes

def detectMotion(frame, avg):
	motionStarted = False
	croppedFrame = None

	# crop image to motion area
	# frame[y: y+h, x: x+w]
	y = int(motionArea_y1 * frame.shape[0])
	yh = int(motionArea_y2 * frame.shape[0])
	x = int(motionArea_x1 * frame.shape[1])
	xh = int(motionArea_x2 * frame.shape[1])

	if y > 1 and yh > 1 and x > 1 and xh > 1:
		croppedFrame = frame[y: yh, x: xh].copy()
	else:
		croppedFrame = frame
	# cv2.rectangle(frame, (x, y), (xh, yh), (255,0,0), 2)

	# resize the frame, convert it to grayscale, and blur it
	gray = cv2.cvtColor(imutils.resize(croppedFrame, width=300), cv2.COLOR_BGR2GRAY)
	gray = cv2.GaussianBlur(gray, (21, 21), 0)

	# if the first frame is None, initialize it
	if avg is None:
		avg = gray.copy().astype('float')

	# accumulate the weighted average between the current frame and
	# previous frames, then compute the difference between the current
	# frame and running average
	cv2.accumulateWeighted(gray, avg, 0.5)
	frameDelta = cv2.absdiff(gray, cv2.convertScaleAbs(avg))
	thresh = cv2.threshold(frameDelta, motionThreshold, 255, cv2.THRESH_BINARY)[1]

	# dilate the thresholded image to fill in holes, then find contours
	# on thresholded image
	thresh = cv2.dilate(thresh, None, iterations=2)
	contours, heir = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

	# determine if the there's motion in this frame
	for contour in contours:
		# if the contour is too small, ignore it
		if cv2.contourArea(contour) < MIN_CONTOUR_AREA:
			continue

		# # compute the bounding box for the contour
		# (x, y, w, h) = cv2.boundingRect(contour)
		#
		# if regionDetect:
		# 	if y < ymax and x < xmax and x+w > xmin and y+h > ymin:
		# 		motionStarted = True
		# else:
		# 	motionStarted = True

		motionStarted = True

	return motionStarted, avg

def percentage(percent, wholeNum):
	if wholeNum == 0:
		print('Bad value for max number')
	elif percent >= wholeNum:
		print('Percentage will return greater than a 100 percent value')
	else:
		percent = float(percent)
		wholeNum = float(wholeNum)
		return (percent * wholeNum) / 100.0

def getCameraNumber(camera):
	return camera.replace('/dev/video', '')

def createFolderIfNotExists(path):
	if not os.path.exists(path):
		os.makedirs(path)
	return path

def getCameraFolderName():
	return cameraId

def getEventsPath():
	basePath = createFolderIfNotExists('/usr/local/lib/open-automation/camera')

	return createFolderIfNotExists(basePath + '/events')

def getTempPath():
	tempBasePath = createFolderIfNotExists('/tmp/open-automation')

	return createFolderIfNotExists(tempBasePath + '/events')

def getCameraPath():
	return createFolderIfNotExists(getEventsPath() + '/' + getCameraFolderName())

def getCameraTempPath():
	return createFolderIfNotExists(getTempPath() + '/' + getCameraFolderName())

def getAudioFilePath():
	audioFile = getFileName(fileTimestamp) + '.wav'
	audioFilePath = getCameraTempPath() + '/' + audioFile
	print("audioFilePath", audioFilePath)
	return audioFilePath

def getDatePath(date):
	cameraPath = getCameraPath()
	yearPath = createFolderIfNotExists(cameraPath + '/' + date.strftime('%Y'))
	monthPath = createFolderIfNotExists(yearPath + '/' + date.strftime('%m'))
	datePath = createFolderIfNotExists(monthPath + '/' +	date.strftime('%d'))

	return datePath

def getFileName(date):
	return date.strftime('%Y-%m-%d_%I:%M:%S%p')

def framerateInterval(frameRate):
	interval = datetime.timedelta(seconds=float(1) / frameRate)
	nextFrameTargetTime = datetime.datetime.now()

	while True:
		nextFrameTargetTime += interval
		secondsUntilNextFrame = (nextFrameTargetTime - datetime.datetime.now()).total_seconds()
		needCatchUpFrame = secondsUntilNextFrame < 0

		if not needCatchUpFrame:
			time.sleep(secondsUntilNextFrame)

		yield needCatchUpFrame

def localDateToUtc(date):
	utcOffsetSec = time.altzone if time.localtime().tm_isdst else time.timezone
	utcOffset = datetime.timedelta(seconds=utcOffsetSec)
	return date + utcOffset;

def getVideoDuration(filename):
	command = [
		'ffprobe',
		'-v',
		'error',
		'-show_entries',
		'format=duration',
		'-of',
		'default=noprint_wrappers=1:nokey=1',
		filename
	  ]

	print(command)
	try:
		output = check_output( command, stderr=STDOUT ).decode()
	except CalledProcessError as e:
		output = e.output.decode()

	output = output.split(".", 1)
	return int(output[0])

def saveRecording(data):
	duration = getVideoDuration(data['tempPath'])
	print('Video duration is ', duration)
	recordingData = {
		'id': str(uuid.uuid4()),
		'camera_id': cameraId,
		'file': data['finishedPath'],
		'date': localDateToUtc(data['date']),
		'duration': duration,
		'width': data['width'],
		'height': data['height']
	}

	db.camera_recordings.insert_one(recordingData)

	# while acw.recording:
	# 	time.sleep(1)
	# 	print('Waiting on audio clip to finish!')

	audioFile = getAudioFilePath()
	print('[NEW RECORDING] Recording saved.', audioFile)

	# mux audio and move the file from the temporary location
	subprocess.call(['ffmpeg', '-y', '-loglevel', 'panic', '-i', data['tempPath'], '-i', audioFile, '-q:v', '0', data['finishedPath']])
	os.remove(audioFile)
	os.remove(data['tempPath'])

	sys.stdout.flush()

##################################################################################################################

# initialize the video stream and allow the camera sensor to
# warmup
camera = VideoStream(src=cameraPath, resolution=(1280,720)).start()

# initialize key clip writer and the consecutive number of
# frames that have *not* contained any action
consecFramesWithMotion = 0
consecFramesWithoutMotion = 0
consecCatchUpFrames = 0
consecCatchUpMaxReached = 0
recordingFramesLength = 0
frame = None
avg = None
motionDetected = False
motionStarted = False
loopCnt = 0
fileTimestamp = None
newAudioRecording = False
# keep looping
for needCatchUpFrame in framerateInterval(frameRate):
	frameTimestamp = datetime.datetime.now()

	# grab the current frame
	frame = camera.read()
	if frame is None:
		break

	# rotate the frame
	if cameraRotation == 180:
		frame = imutils.rotate(frame, cameraRotation);

	motionStarted, avg = detectMotion(frame, avg)

	if motionStarted:
		consecFramesWithoutMotion = 0
		consecFramesWithMotion += 1

		if not motionDetected:
			motionDetected = True
			print('[MOTION]')

	else:
		consecFramesWithMotion = 0
		consecFramesWithoutMotion += 1

	if consecFramesWithoutMotion >= BUFFER_SIZE and motionDetected:
		motionDetected = False
		print('[NO MOTION]')

	sys.stdout.flush()
	continue
