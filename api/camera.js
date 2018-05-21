const services = require('../services/services.js'),
  CameraRecordings = require('./camera-recordings.js');

socket.relay.on('camera/stream/live', (data, callback) => {
  const camera = services.getServiceById(data.camera_service_id);

  camera.streamLive();

  if (typeof callback === 'function') {
    callback(null, camera.id);
  }
});

socket.relay.on('camera/stream/stop', (data, callback) => {
  const camera = services.getServiceById(data.camera_service_id);

  camera.stopStream();

  if (typeof callback === 'function') {
    callback(null, camera.id);
  }
});

socket.relay.on('camera/preview/get', (data, callback) => {
  const camera = services.getServiceById(data.camera_service_id);

  camera.getPreviewImage().then((image) => {
    if (typeof callback === 'function') {
      callback(null, image);
    }
  }).catch((error) => {
    if (typeof callback === 'function') {
      callback(error);
    }
  });
});

socket.relay.on('camera/recording/stream', (data, callback) => {
  CameraRecordings.streamRecording(data.recording_id).then((recordingId) => {
    if (typeof callback === 'function') {
      callback(null, recordingId);
    }
  }).catch((error) => {
    if (typeof callback === 'function') {
      callback(error);
    }
  });
});

socket.relay.on('camera/recording/stream/stop', (data, callback) => {
  CameraRecordings.stopStream(data.recording_id);

  if (typeof callback === 'function') {
    callback(null, data.recording_id);
  }
});

socket.relay.on('camera/recordings/stream', (data, callback) => {
  // TODO: Figure out how ffmpeg plays multiple files.
  // TODO: Perhaps make the stream id a concatenation of all of the recording ids.
});

socket.relay.on('camera/recordings/stream/stop', (data, callback) => {
  // TODO
});

socket.relay.on('camera/recordings/get', function (data, callback) {
  CameraRecordings.getRecordings(data.camera_id).then((recordings) => {
    if (typeof callback === 'function') {
      callback(null, recordings);
    }
  }).catch((error) => {
    if (typeof callback === 'function') {
      callback(error);
    }
  });
});
