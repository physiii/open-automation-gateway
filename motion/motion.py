# USAGE
# python motion2.py --output output

##################################################################################################################
# import the necessary packages
from keyevent.keyclipwriter import KeyClipWriter
from imutils.video import VideoStream
import argparse
import warnings
import datetime
import time
import imutils
import json
import cv2
import os
import shutil
import sys
import uuid

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
    print('Bad value for max number')
  elif percent >= wholeNum:
    print('Percentage will return greater than a 100 percent value')
  else:
    percent = float(percent)
    wholeNum = float(wholeNum)
    return (percent * wholeNum) / 100.0

def getCameraNumber(camera):
  return camera.replace('/dev/video', '')

def getCameraFolderName(camera):
  return camera[-1:]

def createFolderIfNotExists(path):
  if not os.path.exists(path):
    os.mkdir(path)
  return path

def getBasePath():
  return createFolderIfNotExists('/usr/local/lib/gateway')

def getEventsPath():
  return createFolderIfNotExists(getBasePath() + '/events')

def getTempPath():
  return createFolderIfNotExists(getBasePath() + '/temp')

def getCameraPath(camera):
  return createFolderIfNotExists(getEventsPath() + '/' + getCameraFolderName(camera))

def getCameraTempPath(camera):
  return createFolderIfNotExists(getTempPath() + '/' + getCameraFolderName(camera))

def getDatePath(camera, date):
  cameraPath = getCameraPath(camera)
  yearPath = createFolderIfNotExists(cameraPath + '/' + date.strftime('%Y'))
  monthPath = createFolderIfNotExists(yearPath + '/' + date.strftime('%m'))
  datePath = createFolderIfNotExists(monthPath + '/' +  date.strftime('%d'))

  return datePath

def getFileName(date):
  return date.strftime('%Y-%m-%d_%I:%M:%S%p') + '.avi'

def framerateInterval(framerate):
  interval = datetime.timedelta(seconds=float(1) / framerate)
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

def saveRecording(data):
  db.camera_recordings.insert_one({
    'id': str(uuid.uuid4()),
    'camera_id': camera_id,
    'file': data['finishedPath'],
    'date': localDateToUtc(data['date']),
    'duration': data['duration'],
    'width': data['width'],
    'height': data['height']
  })

  # move the file from the temporary location
  os.rename(data['tempPath'], data['finishedPath'])

  print('[NEW RECORDING] Recording saved.')
  sys.stdout.flush()

##################################################################################################################
# Parse arguments

ap = argparse.ArgumentParser()
ap.add_argument('-c', '--camera', dest='camera', type=str, required=True, help='path to video device interface (e.g. /dev/video0)')
ap.add_argument('-i', '--camera-id', dest='camera-id', type=str, required=True, help='unique id of camera service')
args = vars(ap.parse_args())

camera_path = args['camera']
camera_id = args['camera-id']

##################################################################################################################
# Start MongoDB

try:
  connection = MongoClient('mongodb://localhost:27017')
  print('Database connected')
  db = connection.gateway
except:
  print('Error: Unable to connect to database')
  sys.stdout.flush()
  connection = None

##################################################################################################################

# construct the argument parse and parse the arguments

r_height = 200
r_width = 300
xmin = 0
ymin = 100
region_detect = False
xmax = xmin + r_width
ymax = ymin + r_height
avg = None

##################################################################################################################

# initialize the video stream and allow the camera sensor to
# warmup
camera = VideoStream(src=camera_path).start()
time.sleep(2.5)

# initialize key clip writer and the consecutive number of
# frames that have *not* contained any action
framerate = 30
bufSize = 3 * framerate # seconds * framerate
kcw = KeyClipWriter(bufSize)
consecFrames = 0
fileFramesLength = 0
lastUploaded = datetime.datetime.now()
frame = None
motionCounter = 0

# keep looping
for needCatchUpFrame in framerateInterval(framerate):
  if needCatchUpFrame:
    kcw.update(frame)
    continue

  motionDetected = False
  frameTimestamp = datetime.datetime.now()

  # grab the current frame
  frame = camera.read()

  #resize the frame, convert it to grayscale, and blur it
  gray = cv2.cvtColor(imutils.resize(frame, width=600), cv2.COLOR_BGR2GRAY)
  gray = cv2.GaussianBlur(gray, (21, 21), 0)

  # if the first frame is None, initialize it
  if avg is None:
    avg = gray.copy().astype('float')

  # accumulate the weighted average between the current frame and
  # previous frames, then compute the difference between the current
  # frame and running average
  cv2.accumulateWeighted(gray, avg, 0.2)
  frameDelta = cv2.absdiff(gray, cv2.convertScaleAbs(avg))
  thresh = cv2.threshold(frameDelta, 25, 255, cv2.THRESH_BINARY)[1]

  # dilate the thresholded image to fill in holes, then find contours
  # on thresholded image
  thresh = cv2.dilate(thresh, None, iterations=2)
  im2, cnts, heir = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL,
    cv2.CHAIN_APPROX_SIMPLE)

# only proceed if at least one contour was found
  for c in cnts:
    # if the contour is too small, ignore it
    if cv2.contourArea(c) < 5000:
      continue

    # compute the bounding box for the contour
    (x, y, w, h) = cv2.boundingRect(c)

    if region_detect:
      if y < ymax and x < xmax and x+w > xmin and y+h > ymin:
        motionDetected = True
    else:
      motionDetected = True

  if motionDetected:
    if (frameTimestamp - lastUploaded).seconds >= 1.0:
      motionCounter += 1

    if motionCounter >= 2:
      consecFrames = 0

      # if we are not already recording, start recording
      if not kcw.recording:
        print('[MOTION] Detected motion.')

        # save a preview image
        cv2.imwrite(getCameraPath(camera_path) + '/preview.jpg', frame)

        fileFramesLength = 0
        fileTimestamp = frameTimestamp
        fileName = getFileName(fileTimestamp)
        tempRecordingPath = getCameraTempPath(camera_path) + '/' + fileName
        finishedRecordingPath = getDatePath(camera_path, fileTimestamp) + '/' + fileName

        kcw.start(tempRecordingPath, cv2.VideoWriter_fourcc(*'PIM1'), framerate)

  consecFrames += 1
  fileFramesLength += 1
  if consecFrames >= (bufSize + 10):
    consecFrames = 0

  # add frameTimestamp text to frame
  # text shadow
  cv2.putText(frame, frameTimestamp.strftime('%-m/%-d/%Y %-I:%M:%S %p'),
    (11, frame.shape[0] - 9), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 0, 0), 4)
  # text
  cv2.putText(frame, frameTimestamp.strftime('%-m/%-d/%Y %-I:%M:%S %p'),
    (10, frame.shape[0] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (60, 255, 60), 2)

  # Draw region detection area
  if region_detect:
    cv2.rectangle(frame, (xmin, ymin), (xmax, ymax), (0, 0, 255), 2)

  kcw.update(frame)

  if kcw.recording and consecFrames >= bufSize:
    print('[NO MOTION] Recording finished capturing.')
    sys.stdout.flush()

    recordingData = {
      'tempPath': tempRecordingPath,
      'finishedPath': finishedRecordingPath,
      'date': fileTimestamp,
      'duration': float(fileFramesLength) / framerate,
      'width': frame.shape[1],
      'height': frame.shape[0]
    }

    kcw.finish(saveRecording, recordingData)

    # create a new KeyClipWriter. the existing one continues saving the 
    # recording in a separate thread
    kcw = KeyClipWriter(bufSize)

  sys.stdout.flush()
  continue
