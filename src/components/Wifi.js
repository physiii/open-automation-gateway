import React from 'react';
import { Button, Typography, Grid, Select, MenuItem, TextField } from '@mui/material';

const Wifi = ({ ssid, password, handleSetRouterInfo, setSsid, setPassword, routerList }) => {
  return (
    <Grid item xs={12}>
      <Typography variant="h5" gutterBottom>Wi-Fi Setup</Typography>
      <Select
        variant="outlined"
        fullWidth
        value={ssid}
        onChange={(e) => setSsid(e.target.value)}
      >
        {routerList.map((router, index) => (
          <MenuItem key={index} value={router.ssid}>{router.ssid}</MenuItem>
        ))}
      </Select>
      <TextField
        variant="outlined"
        fullWidth
        label="Or enter Wi-Fi name manually"
        value={ssid}
        onChange={(e) => setSsid(e.target.value)}
      />
      <TextField
        variant="outlined"
        fullWidth
        label="Enter Wi-Fi password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button variant="contained" color="primary" fullWidth onClick={handleSetRouterInfo}>Save</Button>
    </Grid>
  );
}

export default Wifi;
