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

rHeight = 200
rWidth = 300
xmin = 0
ymin = 100
xmax = xmin + rWidth
ymax = ymin + rHeight

FRAMERATE = 16
BUFFER_SIZE = 3 * FRAMERATE # seconds * framerate
MIN_MOTION_FRAMES = 16 # minimum number of consecutive frames with motion required to trigger motion detection
MAX_CATCH_UP_FRAMES = 30 # maximum number of consecutive catch-up frames before forcing evaluation of a new frame
MAX_CATCH_UP_MAX_REACHED = 10 # script will exit if max catch up frames limit is reached this many times consecutively

##################################################################################################################
# Parse arguments

ap = argparse.ArgumentParser()
ap.add_argument('-c', '--camera', dest='camera', type=str, required=True, help='path to video device interface (e.g. /dev/video0)')
ap.add_argument('-i', '--camera-id', dest='camera-id', type=str, required=True, help='unique id of camera service')
ap.add_argument('-r', '--rotation', dest='rotation', type=int, required=False, default=0, help='degrees of rotation for the picture - supported values: 0, 180')
ap.add_argument('-t', '--threshold', dest='threshold', type=int, required=False, default=10, help='Threshold used to begin recording motion')
args = vars(ap.parse_args())

cameraPath = args['camera']
cameraId = args['camera-id']
cameraRotation = args['rotation']
motionThreshold = args['threshold']

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

def createFolderIfNotExists(path):
  if not os.path.exists(path):
    os.mkdir(path)
  return path

def getCameraFolderName():
  return cameraId

def getEventsPath():
  basePath = createFolderIfNotExists('/usr/local/lib/gateway')

  return createFolderIfNotExists(basePath + '/events')

def getTempPath():
  tempBasePath = createFolderIfNotExists('/tmp/open-automation-gateway')

  return createFolderIfNotExists(tempBasePath + '/events')

def getCameraPath():
  return createFolderIfNotExists(getEventsPath() + '/' + getCameraFolderName())

def getCameraTempPath():
  return createFolderIfNotExists(getTempPath() + '/' + getCameraFolderName())

def getDatePath(date):
  cameraPath = getCameraPath()
  yearPath = createFolderIfNotExists(cameraPath + '/' + date.strftime('%Y'))
  monthPath = createFolderIfNotExists(yearPath + '/' + date.strftime('%m'))
  datePath = createFolderIfNotExists(monthPath + '/' +  date.strftime('%d'))

  return datePath

def getFileName(date):
  return date.strftime('%Y-%m-%d_%I:%M:%S%p') + '.avi'

def framerateInterval(FRAMERATE):
  interval = datetime.timedelta(seconds=float(1) / FRAMERATE)
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
    'camera_id': cameraId,
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

# initialize the video stream and allow the camera sensor to
# warmup
camera = VideoStream(src=cameraPath).start()
time.sleep(2.5)

# initialize key clip writer and the consecutive number of
# frames that have *not* contained any action
consecFramesWithMotion = 0
consecFramesWithoutMotion = 0
consecCatchUpFrames = 0
consecCatchUpMaxReached = 0
recordingFramesLength = 0
frame = None
avg = None
regionDetect = False
kcw = KeyClipWriter(BUFFER_SIZE)

# keep looping
for needCatchUpFrame in framerateInterval(FRAMERATE):
  # repeat the last frame if motion detection isn't keeping up with the framerate
  if needCatchUpFrame and consecCatchUpFrames < MAX_CATCH_UP_FRAMES:
    consecCatchUpFrames += 1

    kcw.update(frame)

    if motionDetected:
      consecFramesWithMotion += 1
    else:
      consecFramesWithoutMotion += 1

    if kcw.recording:
      recordingFramesLength += 1

    continue

  # if too many catch-up frames have been needed, force getting a fresh frame from the camera
  if consecCatchUpFrames >= MAX_CATCH_UP_FRAMES:
    consecCatchUpMaxReached += 1

    # if motion detection is failing to keep up with the framerate for too
    # long, terminate the script so the camera service can try starting
    # motion detection again.
    if consecCatchUpMaxReached >= MAX_CATCH_UP_MAX_REACHED and not kcw.recording:
      print('Cannot process frames fast enough for motion detection. Exiting.')
      sys.stdout.flush()
      sys.exit()

    print('Reached maximum number of catch-up frames (' + str(MAX_CATCH_UP_FRAMES) + '). Forcing evaluation of new frame from camera.')
    sys.stdout.flush()
  else:
    consecCatchUpMaxReached = 0

  consecCatchUpFrames = 0

  motionDetected = False
  frameTimestamp = datetime.datetime.now()

  # grab the current frame
  frame = camera.read()

  # if a frame could not be grabbed, try again
  if frame is None:
    continue

  # rotate the frame
  if cameraRotation is 180:
    frame = imutils.rotate(frame, cameraRotation);
  # continue
  # resize the frame, convert it to grayscale, and blur it
  gray = cv2.cvtColor(imutils.resize(frame, width=200), cv2.COLOR_BGR2GRAY)
  # gray = cv2.GaussianBlur(gray, (21, 21), 0)

  # if the first frame is None, initialize it
  if avg is None:
    avg = gray.copy().astype('float')

  # accumulate the weighted average between the current frame and
  # previous frames, then compute the difference between the current
  # frame and running average
  cv2.accumulateWeighted(gray, avg, 0.2)
  frameDelta = cv2.absdiff(gray, cv2.convertScaleAbs(avg))
  thresh = cv2.threshold(frameDelta, motionThreshold, 255, cv2.THRESH_BINARY)[1]

  # dilate the thresholded image to fill in holes, then find contours
  # on thresholded image
  thresh = cv2.dilate(thresh, None, iterations=2)
  contours, heir = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

  # determine if the there's motion in this frame
  for contour in contours:
    # if the contour is too small, ignore it
    if cv2.contourArea(contour) < 5000:
      continue

    # compute the bounding box for the contour
    (x, y, w, h) = cv2.boundingRect(contour)

    if regionDetect:
      if y < ymax and x < xmax and x+w > xmin and y+h > ymin:
        motionDetected = True
    else:
      motionDetected = True

  if motionDetected:
    consecFramesWithoutMotion = 0
    consecFramesWithMotion += 1

    # if we are not already recording, start recording
    if consecFramesWithMotion >= MIN_MOTION_FRAMES and not kcw.recording:
      print '[MOTION] Detected motion. Threshold: ',motionThreshold

      # save a preview image
      cv2.imwrite(getCameraPath() + '/preview.jpg', frame)

      fileTimestamp = frameTimestamp
      fileName = getFileName(fileTimestamp)
      tempRecordingPath = getCameraTempPath() + '/' + fileName
      finishedRecordingPath = getDatePath(fileTimestamp) + '/' + fileName

      kcw.start(tempRecordingPath, cv2.VideoWriter_fourcc(*'MJPG'), FRAMERATE)
  else:
    consecFramesWithMotion = 0
    consecFramesWithoutMotion += 1

  if kcw.recording:
    recordingFramesLength += 1

  # add frameTimestamp text to frame
  # text shadow
  cv2.putText(frame, frameTimestamp.strftime('%-m/%-d/%Y %-I:%M:%S %p'),
    (11, frame.shape[0] - 9), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 0, 0), 4)
  # text
  cv2.putText(frame, frameTimestamp.strftime('%-m/%-d/%Y %-I:%M:%S %p'),
    (10, frame.shape[0] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (60, 255, 60), 2)

  # Draw region detection area
  if regionDetect:
    cv2.rectangle(frame, (xmin, ymin), (xmax, ymax), (0, 0, 255), 2)

  kcw.update(frame)

  if kcw.recording and consecFramesWithoutMotion >= BUFFER_SIZE:
    print('[NO MOTION] Recording finished capturing.')
    sys.stdout.flush()

    recordingData = {
      'tempPath': tempRecordingPath,
      'finishedPath': finishedRecordingPath,
      'date': fileTimestamp,
      'duration': float(recordingFramesLength + BUFFER_SIZE) / FRAMERATE,
      'width': frame.shape[1],
      'height': frame.shape[0]
    }

    kcw.finish(saveRecording, recordingData)

    # create a new KeyClipWriter. the existing one continues saving the
    # recording in a separate thread
    kcw = KeyClipWriter(BUFFER_SIZE)

    recordingFramesLength = 0

  sys.stdout.flush()
  continue
