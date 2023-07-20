import React, { useState } from 'react';
import './App.css';
import FileUploader from './components/FileUploader';
import DataDisplay from './components/DataDisplay';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';

function App() {
  const [data, setData] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null); // New state variable for the selected model
  const [fetchedResults, setFetchedResults] = useState(null); // New state variable for fetched results

  const handleUpload = (uploadedData, uploadedFileName, selectedModel) => {
    setData(uploadedData);
    setFileName(uploadedFileName);
    setSelectedModel(selectedModel); // Set the selected model
  };

  const handleViewScores = (results) => {
    setFetchedResults(results); // Store the fetched results in state
  };


  return (
    <div className="root">
      <AppBar position="static" className="app-bar" style={{ backgroundColor: 'white' }}>
        <Toolbar>
          {/* Logo on the left */}
          <Box className="logo-left">
            <img src="/logo.webp" alt="logo" className="logo-image" />
          </Box>

          {/* Title */}
          <Typography variant="h6" className="title">
            Admin Page
          </Typography>

          {/* Logo on the right */}
          <Box className="logo-right" sx={{ display: { xs: 'none', sm: 'block' } }}>
            <img src="/logo.svg" alt="logo" className="logo-image" />
          </Box>
        </Toolbar>
      </AppBar>

      <div className="App">
        <FileUploader onUpload={handleUpload} onViewScores={handleViewScores}/>
        {data && <DataDisplay data={data} fileName={fileName} selectedModel={selectedModel} />} {/* Pass selectedModel as a prop */}
      </div>
    </div>
  );
}

export default App;
