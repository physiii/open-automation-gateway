import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Box, Container, CssBaseline, Grid, ThemeProvider, createTheme } from '@mui/material';
import { io } from 'socket.io-client';

import Camera from './components/Camera';
import Thermostat from './components/Thermostat';
import Lighting from './components/Lighting';
import Wifi from './components/Wifi';
import Sidebar from './components/Sidebar';

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  const [socket, setSocket] = useState(null);
  const [routerList, setRouterList] = useState([]);
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const newSocket = io();

    newSocket.on('router list', (data) => {
      setRouterList(data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const handleSearchForNetworkThermostats = () => {
    socket.emit('searchForNetworkThermostats');
  }

  const handleSearchForHueBridges = () => {
    socket.emit('searchForHueBridges');
  }

  const handleSearchForLights = () => {
    socket.emit('searchForLights');
  }

  const handleCreateLedController = () => {
    socket.emit('createLedController');
  }

  const handleSetRouterInfo = () => {
    socket.emit('store ap', { ssid, password });
  }

  if (!socket) {
    return <div>Loading...</div>; 
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ bgcolor: '#424242', minHeight: '100vh' }}>
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6" color="inherit">
                Open-Automation
              </Typography>
            </Toolbar>
          </AppBar>
          <Grid container>
            <Grid item xs={2}>
              <Sidebar 
                handleSearchForNetworkThermostats={handleSearchForNetworkThermostats}
                handleCreateLedController={handleCreateLedController}
                handleSearchForHueBridges={handleSearchForHueBridges}
                handleSearchForLights={handleSearchForLights}
                ssid={ssid}
                password={password}
                routerList={routerList}
                handleSetRouterInfo={handleSetRouterInfo}
                setSsid={setSsid}
                setPassword={setPassword}
              />
            </Grid>
            <Grid item xs={10}>
              <Container maxWidth="md" sx={{ mt: 4 }}>
                <Box sx={{ bgcolor: '#424242', p: 4, borderRadius: 2 }}>
                  <Routes>
                    <Route path="/camera" element={<Camera socket={socket} />} />
                    <Route path="/thermostat" element={<Thermostat handleSearchForNetworkThermostats={handleSearchForNetworkThermostats} />} />
                    <Route path="/lighting" element={<Lighting handleCreateLedController={handleCreateLedController} handleSearchForHueBridges={handleSearchForHueBridges} handleSearchForLights={handleSearchForLights} />} />
                    <Route path="/wifi" element={<Wifi ssid={ssid} password={password} routerList={routerList} handleSetRouterInfo={handleSetRouterInfo} setSsid={setSsid} setPassword={setPassword} />} />
                  </Routes>
                </Box>
              </Container>
            </Grid>
          </Grid>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
