
// src/components/FeedbackDisplay.js
import React from 'react';

const FeedbackDisplay = ({ feedback, loading }) => {
  if (!feedback) return null;
  
  return (
    <div className="feedback-container">
      <h3>Feedback:</h3>
      <div className="feedback-content">
        <p>Your response: <strong>{feedback.user_response}</strong></p>
        {feedback.is_correct ? (
          <p className="correct-answer">Correct! 👏</p>
        ) : (
          <p className="incorrect-answer">Try again! 🔄</p>
        )}
        <p>Correct answer: <strong>{feedback.correct_answer}</strong></p>
      </div>
    </div>
  );
};

export default FeedbackDisplay;

