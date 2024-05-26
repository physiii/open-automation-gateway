import React from 'react';
import { Button, Typography, Grid } from '@mui/material';

const Lighting = ({ handleCreateLedController, handleSearchForHueBridges, handleSearchForLights }) => {
  return (
    <Grid item xs={12}>
      <Typography variant="h5" gutterBottom>Lighting</Typography>
      <Button variant="outlined" color="primary" onClick={handleCreateLedController}>Create Light Controller</Button>
      <Button variant="outlined" color="primary" onClick={handleSearchForHueBridges}>Search for Hue Light Bridges (hold link button)</Button>
      <Button variant="outlined" color="primary" onClick={handleSearchForLights}>Search for Lights</Button>
    </Grid>
  );
}

export default Lighting;
