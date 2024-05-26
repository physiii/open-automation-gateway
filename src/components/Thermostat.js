import React from 'react';
import { Button, Typography, Grid } from '@mui/material';

const Thermostat = ({ handleSearchForNetworkThermostats }) => {
  return (
    <Grid item xs={12}>
      <Typography variant="h5" gutterBottom>Thermostats</Typography>
      <Button variant="outlined" color="primary" onClick={handleSearchForNetworkThermostats}>Search for Network Thermostats</Button>
    </Grid>
  );
}

export default Thermostat;
