import React, { useState, useEffect } from 'react';
import { Button, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, TextField } from '@mui/material';

const Camera = ({ socket }) => {
  const [cameras, setCameras] = useState([]);
  const [addedCameras, setAddedCameras] = useState([]);
  const [discovering, setDiscovering] = useState(false);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });

  useEffect(() => {
    socket.on('discoveredCameras', (data) => {
      setCameras(data);
      setDiscovering(false);
    });

    socket.on('cameraRtspUrlReceived', (data) => {
      const updatedCameras = addedCameras.map(cam => cam.ip === data.ip ? { ...cam, rtspURL: data.rtspURL } : cam);
      setAddedCameras(updatedCameras);
    });

    socket.on('device list', (data) => {
      console.log('device list', data);
    
      const newCameras = data
        .filter(device => device.services.some(service => ['network-camera', 'camera'].includes(service.type)))
        .map(device => ({
          name: device.settings.name,
          ip: device.services[0].ip_address,
          rtspURL: device.services[0].network_path,
          id: device.services[0].id
        }))
        .filter(newCam => !addedCameras.some(addedCam => addedCam.ip === newCam.ip || addedCam.id === newCam.id)); // This line filters out duplicates
    
      setAddedCameras(prevCameras => [...prevCameras, ...newCameras]);
    });   

    return () => {
      socket.off('discoveredCameras');
      socket.off('cameraRtspUrlReceived');
      socket.off('device list');
    };
  }, [socket, addedCameras]);

  const handleSearchForLocalCameras = () => {
    socket.emit('searchForLocalCameras');
  }

  const handleSearchForNetworkCameras = () => {
    setDiscovering(true);
    socket.emit('searchForNetworkCameras');
  }

  const handleAddCamera = (camera) => {
    // Check if the camera already exists in addedCameras by IP or ID
    const isCameraAlreadyAdded = addedCameras.some(cam => cam.ip === camera.ip || cam.id === camera.id);

    if (!isCameraAlreadyAdded) {
        setAddedCameras(prev => [...prev, { ...camera, rtspURL: 'Loading...' }]);
        socket.emit('addCamera', { ...camera, ...credentials });
    } else {
        console.warn(`Camera with IP: ${camera.ip} or ID: ${camera.id} is already added.`);
    }
    
    setCredentials({ username: '', password: '' });
    setSelectedCameraIndex(null);
  }

  const handleEditCamera = (camera) => {
    socket.emit('editCamera', camera);
  }

  const handleRemoveCamera = (camera) => {
    console.log('Removing camera:', camera);
    socket.emit('removeDevice', camera);
    setAddedCameras(prev => prev.filter(cam => cam.ip !== camera.ip));
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h5" gutterBottom>Discover Cameras</Typography>
        <Button variant="outlined" color="primary" onClick={handleSearchForNetworkCameras}>Search for Network Cameras</Button>
        <Button variant="outlined" color="primary" onClick={handleSearchForLocalCameras}>Search for Attached Cameras</Button>

        {discovering && (
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '20px' }}>
            <CircularProgress size={24} style={{ marginRight: '10px' }} />
            Discovering cameras...
          </div>
        )}

        {cameras.length > 0 && (
          <TableContainer component={Paper} style={{ marginTop: '20px' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cameras.map((camera, index) => (
                  <TableRow key={index}>
                    <TableCell>{camera.name || "N/A"}</TableCell>
                    <TableCell>{camera.ip}</TableCell>
                    <TableCell>
                      {selectedCameraIndex === index ? (
                        <>
                          <TextField
                            label="Username"
                            variant="outlined"
                            size="small"
                            value={credentials.username}
                            onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                            style={{ marginRight: '10px' }}
                          />
                          <TextField
                            label="Password"
                            variant="outlined"
                            size="small"
                            type="password"
                            value={credentials.password}
                            onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                            style={{ marginRight: '10px' }}
                          />
                          <Button variant="contained" color="primary" onClick={() => handleAddCamera(camera)}>Confirm</Button>
                        </>
                      ) : (
                        <Button variant="contained" color="primary" onClick={() => setSelectedCameraIndex(index)}>Add</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Grid>

      <Grid item xs={12}>
        <Typography variant="h5" gutterBottom>Added Cameras</Typography>
        {addedCameras.length > 0 && (
          <TableContainer component={Paper} style={{ marginTop: '20px' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>Action</TableCell> {/* RTSP URL Column removed */}
                </TableRow>
              </TableHead>
              <TableBody>
                {addedCameras.map((camera, index) => (
                  <TableRow key={index}>
                    <TableCell>{camera.name || "N/A"}</TableCell>
                    <TableCell>{camera.ip}</TableCell>
                    <TableCell>
                      <Button variant="contained" color="primary" onClick={() => handleEditCamera(camera)} style={{ marginRight: '10px' }}>Edit</Button>
                      <Button variant="contained" color="secondary" onClick={() => handleRemoveCamera(camera)}>Remove</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Grid>
    </Grid>
  );
}

export default Camera;
