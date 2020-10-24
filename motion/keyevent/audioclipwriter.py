# import the necessary packages
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from threading import Thread
try:
    from Queue import Queue
except ImportError:
    from queue import Queue
import time
import pyaudio
import wave
import cv2
import sys

class AudioClipWriter:
	def __init__(self, audioDevice='hw:7,1', bufSize=1024 * 10):
		# store the maximum buffer size of frames to be kept
		# in memory along with the sleep timeout during threading

		# initialize the buffer of frames, queue of frames that
		# need to be written to file, video writer, writer thread,
		# and boolean indicating whether recording has started or not
		self.frames = deque(maxlen=bufSize)
		self.recordedFrames = deque(maxlen=None)
		self.thread = None
		self.recording = False
		self.audioDevice = audioDevice
		self.finished = False

		#initialize the audio device and start streaming
		self.CHANNELS = 2
		self.CHUNK = 1024 * 5
		self.FORMAT = pyaudio.paInt16
		self.audio = pyaudio.PyAudio()

		self.index = self.getAudioDeviceIndex(self.audio)
		self.RATE = int(self.audio.get_device_info_by_index(self.index)['defaultSampleRate'])
		print(self.audio.get_device_info_by_index(self.index))

		self.stream = self.audio.open(
						format=self.FORMAT,
		                channels=self.CHANNELS,
		                rate=self.RATE,
		                input=True,
                		input_device_index=self.index)

		self.audioThread = Thread(target=self.fillAudioBuffer, args=())
		self.audioThread.setDaemon(True)
		self.audioThread.start()

	def fillAudioBuffer(self):
		addedPreload = False
		while True:
			data = self.stream.read(self.CHUNK, exception_on_overflow = False)
			if self.recording:
				if not addedPreload:
						self.recordedFrames.extend(self.frames)
						addedPreload = True
				self.recordedFrames.append(data)
			else:
				addedPreload = False
				self.frames.append(data)

	def getAudioDeviceIndex(self, audio):
		index = 0
		for i in range(audio.get_device_count()):
			device = str(audio.get_device_info_by_index(i))
			if self.audioDevice in device:
				index = i
				break

		return index

	def start(self, path):
		self.wf = wave.open(path, 'wb')
		self.wf.setnchannels(self.CHANNELS)
		self.wf.setsampwidth(self.audio.get_sample_size(self.FORMAT))
		self.wf.setframerate(self.RATE)
		self.recording = True

	def finish(self):
		self.wf.writeframes(b''.join(self.recordedFrames))
		self.recording = False
		self.wf.close()
		self.recordedFrames.clear()
		print('Recorded audio file.', len(self.frames))
