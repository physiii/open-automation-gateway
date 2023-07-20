import React, { useState } from 'react';
import axios from 'axios';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Radio,
  FormControlLabel,
  Button,
} from '@mui/material';
import './DataDisplay.css';

const DataDisplay = ({ data, fileName, selectedModel }) => {
  const [slideScores, setSlideScores] = useState({});
  const [averageScore, setAverageScore] = useState(null);
  const [fetchedResults, setFetchedResults] = useState(null);
  const [regeneratedQuestion, setRegeneratedQuestion] = useState(null);

  if (!data || !data.slides || !Array.isArray(data.slides) || data.slides.length === 0) {
    return <Typography className="no-data" variant="h6">No data available</Typography>;
  }

  const handleFetchScores = async () => {
    try {
      // Fetch scores from the server
      const response = await axios.get('/fetch-scores');
      console.log(response.data);
      setFetchedResults(response.data); // Store the fetched results in state
    } catch (error) {
      console.error('Error fetching scores:', error);
    }
  };

  const handleRegenerateQuestion = async (slideIndex, score) => {
    try {

      console.log("Slide Number:", slideIndex, "Current Score:", score);

      const slide = data.slides[slideIndex];
      const slideContext = slide.content; // Get the original slide context
      const originalQuestion = slide.question_data; // Get the original question object
      const rating = Math.min(Math.max(score, 0), 4); // Clamp the score between 0 and 4
  
      const prompt = {
        slideContext,
        originalQuestion,
        rating,
      };
  
      const response = await axios.post('/regenerate', { prompt });
      console.log(response.data)

      slide.question_data = response.data;

      const regeneratedQuestion = response.data;  
      setRegeneratedQuestion(regeneratedQuestion); // Store the regenerated question in state
    } catch (error) {
      console.error('Error regenerating question:', error);
    }
  };  

  const handleSendScores = async () => {
    // Create an array of slide scores
    const scores = data.slides.map((slide, index) => slideScores[index] || null);

    // Calculate the average score
    const totalScore = scores.reduce((acc, score) => acc + (score || 0), 0);
    const average = totalScore / scores.length;

    // Prepare the payload with scores, data, average score and selectedModel
    const payload = {
      scores: scores,
      data: data,
      averageScore: average,
      fileName: fileName,
      model: selectedModel // added selectedModel to the payload
    };

    // Log payload to console for debugging
    console.log("Sending payload:", payload);

    try {
      // Send the payload to the server using axios
      const response = await axios.post('/send-scores', payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      // Scores sent successfully, do something with the response if needed
      console.log(response.data);
    } catch (error) {
      console.error('Error sending scores:', error);
    }
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
          },
          marginTop: '10px',
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
    <div className="data-container">
      {data.slides.map((slide, index) => (
        <Paper key={index} className="data-item" elevation={3}>
          <Typography variant="h6" className="slide-number">
            Slide {slide.slide}
          </Typography>
          <Divider style={{ marginBottom: '15px' }} />

          {/* Display the content */}
          <Typography variant="body1" className="content">
            <strong>Content:</strong>
            {slide.content}
          </Typography>

          {/* The rest of the fields */}
          <List>
            <ListItem>
              <ListItemText
                primary={`Question (${slide.question_data?.question_type})`}
                secondary={slide.question_data?.question}
              />
            </ListItem>

            <ListItem>
              <ListItemText
                primary="Choices"
                secondary={
                  slide.question_data?.choices &&
                  slide.question_data.choices.map((choice, cIndex) => (
                    <span key={cIndex}>
                      {String.fromCharCode(65 + cIndex)}. {choice}<br />
                    </span>
                  ))
                }
              />
            </ListItem>

            <ListItem>
              <ListItemText
                primary="Correct Answer"
                secondary={Array.isArray(slide.question_data?.correct_answer)
                  ? slide.question_data.correct_answer.join(', ')
                  : slide.question_data?.correct_answer}
              />
            </ListItem>

            <ListItem>
              <ListItemText
                primary="Explanation"
                secondary={slide.question_data?.explanation}
              />
            </ListItem>

            <ListItem>
              <ListItemText
                primary="Difficulty"
                secondary={slide.question_data?.difficulty}
              />
            </ListItem>

            <button type="submit" onClick={() => handleRegenerateQuestion(index, slideScores[index])} className="default-button-display">
              Regenerate
            </button>


          </List>

          {/* Scoring box */}
          <div className="scoring-box">
            <div className="radio-container">
              <FormControlLabel
                key="1"
                control={
                  <Radio
                    color="primary"
                    checked={slideScores[index] === 1}
                    onChange={() =>
                      setSlideScores((prevScores) => ({
                        ...prevScores,
                        [index]: 1,
                      }))
                    }
                  />
                }
                label="1: Terrible, not acceptable"
              />

              <FormControlLabel
                key="2"
                control={
                  <Radio
                    color="primary"
                    checked={slideScores[index] === 2}
                    onChange={() =>
                      setSlideScores((prevScores) => ({
                        ...prevScores,
                        [index]: 2,
                      }))
                    }
                  />
                }
                label="2: Close, but not acceptable"
              />

              <FormControlLabel
                key="3"
                control={
                  <Radio
                    color="primary"
                    checked={slideScores[index] === 3}
                    onChange={() =>
                      setSlideScores((prevScores) => ({
                        ...prevScores,
                        [index]: 3,
                      }))
                    }
                  />
                }
                label="3: Good, but needs edit"
              />

              <FormControlLabel
                key="4"
                control={
                  <Radio
                    color="primary"
                    checked={slideScores[index] === 4}
                    onChange={() =>
                      setSlideScores((prevScores) => ({
                        ...prevScores,
                        [index]: 4,
                      }))
                    }
                  />
                }
                label="4: Perfect, accept as-is"
              />
            </div>
          </div>
        </Paper>
      ))}

      <div className="button-container-display" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
        <button type="submit" onClick={handleSendScores} className="default-button-display">
          Send Scores
        </button>
        <button type="submit" onClick={handleFetchScores} className="default-button-display">
          View Scores
        </button>
      </div>
    </div>
  );
};
export default DataDisplay;
