import argparse
import datetime
import json
import cv2

# Definitions and Functions
def detect_motion(frame, avg, motion_area, motion_threshold, min_contour_area):
    motion_detected = False
    cropped_frame = None

    y = int(motion_area[0] * frame.shape[0])
    yh = int(motion_area[1] * frame.shape[0])
    x = int(motion_area[2] * frame.shape[1])
    xh = int(motion_area[3] * frame.shape[1])

    if y > 1 and yh > 1 and x > 1 and xh > 1:
        cropped_frame = frame[y: yh, x: xh].copy()
    else:
        cropped_frame = frame

    gray = cv2.cvtColor(cv2.resize(cropped_frame, (300, 300)), cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (21, 21), 0)

    if avg is None:
        avg = gray.copy().astype("float")

    cv2.accumulateWeighted(gray, avg, 0.5)
    frame_delta = cv2.absdiff(gray, cv2.convertScaleAbs(avg))
    thresh = cv2.threshold(frame_delta, motion_threshold, 255, cv2.THRESH_BINARY)[1]
    thresh = cv2.dilate(thresh, None, iterations=2)
    contours, heir = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    for contour in contours:
        if cv2.contourArea(contour) >= min_contour_area:
            motion_detected = True
            break

    return motion_detected, avg

# Parse arguments
ap = argparse.ArgumentParser()
ap.add_argument("-v", "--video", type=str, required=True, help="path to input video file")
ap.add_argument("-t", "--threshold", type=int, default=4, help="threshold for motion detection")
args = vars(ap.parse_args())

# Initialize variables
motion_threshold = args["threshold"]
avg_frame = None
motion_frames = 0
total_frames = 0
min_contour_area = 0
motion_area = [0, 1, 0, 1]  # top left and bottom right coordinates relative to frame size

# Open video file
video = cv2.VideoCapture(args["video"])

# Process video frames
while True:
    ret, frame = video.read()

    if not ret:
        break

    motion_detected, avg_frame = detect_motion(frame, avg_frame, motion_area, motion_threshold, min_contour_area)
    total_frames += 1

    if motion_detected:
        motion_frames += 1

# Release video file
video.release()

# Output results as a JSON object
output = {
    "total_frames": total_frames,
    "motion_frames": motion_frames,
    "motion_percentage": (motion_frames / total_frames) * 100 if total_frames > 0 else 0
}

json_output = json.dumps(output, indent=4)
print(json_output)
