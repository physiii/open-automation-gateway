import React from 'react';
import { Link } from 'react-router-dom';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';

const Sidebar = () => {
  return (
    <Box sx={{ bgcolor: '#424242', color: '#fff', height: '100vh' }}>
      <List component="nav">
        <ListItem component={Link} to="/camera" sx={{ color: '#fff', textDecoration: 'none', '&:hover': { backgroundColor: '#666' }}}>
          <ListItemText primary="Camera" />
        </ListItem>
        <ListItem component={Link} to="/thermostat" sx={{ color: '#fff', textDecoration: 'none', '&:hover': { backgroundColor: '#666' }}}>
          <ListItemText primary="Thermostat" />
        </ListItem>
        <ListItem component={Link} to="/lighting" sx={{ color: '#fff', textDecoration: 'none', '&:hover': { backgroundColor: '#666' }}}>
          <ListItemText primary="Lighting" />
        </ListItem>
        <ListItem component={Link} to="/wifi" sx={{ color: '#fff', textDecoration: 'none', '&:hover': { backgroundColor: '#666' }}}>
          <ListItemText primary="Wifi" />
        </ListItem>
      </List>
    </Box>
  );
};

export default Sidebar;
