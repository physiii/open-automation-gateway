import React, { useState } from 'react';
import axios from 'axios';
import { FormControl, FormControlLabel, Radio, RadioGroup, Typography, Button, List, Paper, ListItem, ListItemText } from '@mui/material';
import './FileUploader.css';


const FileUploader = ({ onUpload, onViewScores }) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("Choose file");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedModel, setSelectedModel] = useState("OpenAI");
  const [fetchedResults, setFetchedResults] = useState(null);

  const onFileChange = e => {
    setFile(e.target.files[0]);
    setFileName(e.target.files[0]?.name || "Choose file");
    setError(null);
  };

  const handleFetchScores = async (event) => {
    event.preventDefault();

    try {
      console.log("Fetching scores...");
      // Fetch scores from the server
      const response = await axios.get('/fetch-scores');
      console.log("Fetched Scores:", response.data);
      setFetchedResults(response.data); // Store the fetched results in state
      onViewScores(response.data);
    } catch (error) {
      console.error('Error fetching scores:', error);
    }
  };

  const onUploadClick = async (event) => {
    event.preventDefault();

    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', fileName);
    formData.append('model', selectedModel);

    try {
      const response = await axios.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      onUpload(response.data, fileName, selectedModel); // Pass selectedModel up to the parent
    } catch (error) {
      setError('Error uploading file: ' + error.message);
      console.error('Error uploading file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelChange = (event) => {
    setSelectedModel(event.target.value);
  };

  if (fetchedResults) {
    return (
      <div className="data-container">
        <div className="info-box">
          <Paper elevation={3} style={{ padding: '20px', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" style={{ marginRight: '20px' }}>
                    Scoring Guide:
                </Typography>
                <Typography variant="body1">
                    <strong>1:</strong> Terrible, not acceptable
                </Typography>
                <Typography variant="body1" style={{ marginLeft: '15px', marginRight: '15px' }}>
                    <strong>2:</strong> Close, but not acceptable
                </Typography>
                <Typography variant="body1" style={{ marginLeft: '15px', marginRight: '15px' }}>
                    <strong>3:</strong> Good, but needs edit
                </Typography>
                <Typography variant="body1" style={{ marginLeft: '15px' }}>
                    <strong>4:</strong> Perfect, accept as-is
                </Typography>
            </Paper>
        </div>

        <div className="scrollable-results">
          {fetchedResults.map((result, index) => (
            <Paper key={index} className="result-item" elevation={3}>
              <Typography variant="h6">{result.fileName}</Typography>
              <Typography variant="body2">Model: {result.model}</Typography>
              <Typography variant="body2">Average Score: {result.averageScore.toFixed(2)}</Typography>
              <Typography variant="body2">{result.timestamp}</Typography>
            </Paper>
          ))}
        </div>
        <div className="go-back-button">
        <Button 
          variant="outlined" 
          sx={{
            color: '#D5006C', 
            borderColor: '#D5006C', 
            padding: '10px 20px',
            borderRadius: '5px',
            '&:hover': {
              backgroundColor: '#D5006C',
              color: '#FFFFFF',
            }
          }} 
          onClick={() => setFetchedResults(null)}
        >
          Go Back
        </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="file-uploader-container">
      <form className="file-uploader" onSubmit={onUploadClick}>
        <div className="model-selection-container">
          <FormControl component="fieldset">
            <RadioGroup row value={selectedModel} onChange={handleModelChange} className="model-radio-group">
              <FormControlLabel value="OpenAI" control={<Radio color="primary" />} label="OpenAI" />
              <FormControlLabel value="VertexAI" control={<Radio color="primary" />} label="VertexAI" />
              <FormControlLabel value="Chain" control={<Radio color="primary" />} label="Chain" />
            </RadioGroup>
          </FormControl>
          <div className="custom-file-input">
            <input type="file" id="file" onChange={onFileChange} />
            <label htmlFor="file">{fileName}</label>
          </div>
          <div className="button-container">
            <button type="submit" disabled={isLoading} className="default-button">
              {isLoading ? 'Uploading...' : 'Upload'}
            </button>
            <button type="submit" onClick={handleFetchScores} className="default-button">
              View Scores
            </button>
            {error && <div className="error-message">{error}</div>}
          </div>
        </div>
      </form>
    </div>
  );
};

export default FileUploader;
