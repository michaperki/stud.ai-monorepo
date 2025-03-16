// src/components/FeedbackDisplay.js
import React from 'react';
import { motion } from 'framer-motion';
import { BsCheckCircleFill, BsXCircleFill, BsArrowRightCircle } from 'react-icons/bs';

const FeedbackDisplay = ({ feedback, loading, onNextWord, sessionPaused }) => {
  if (!feedback) return null;
  
  const isCorrect = feedback.is_correct;
  
  return (
    <motion.div 
      className={`feedback-container ${isCorrect ? 'correct' : 'incorrect'}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
    >
      <div className="feedback-header">
        <div className="feedback-icon">
          {isCorrect ? (
            <BsCheckCircleFill size={24} className="icon-correct" />
          ) : (
            <BsXCircleFill size={24} className="icon-incorrect" />
          )}
        </div>
        <h3 className="feedback-title">
          {isCorrect ? 'Correct! 👏' : 'Try again! 🔄'}
        </h3>
      </div>
      
      <div className="feedback-content">
        <div className="feedback-row">
          <span className="feedback-label">Your response:</span>
          <span className="feedback-value">{feedback.user_response}</span>
        </div>
        
        <div className="feedback-row">
          <span className="feedback-label">Correct answer:</span>
          <span className="feedback-value">{feedback.correct_answer}</span>
        </div>
        
        {feedback.pronunciation_score && (
          <div className="feedback-row">
            <span className="feedback-label">Pronunciation score:</span>
            <div className="score-bar-container">
              <div 
                className="score-bar" 
                style={{ width: `${feedback.pronunciation_score}%` }}
              />
              <span className="score-text">{feedback.pronunciation_score}%</span>
            </div>
          </div>
        )}
      </div>
      
      {isCorrect && (
        <motion.button
          className="button primary next-word-button"
          onClick={onNextWord}
          disabled={loading || sessionPaused}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span>Next Word</span>
          <BsArrowRightCircle size={18} />
        </motion.button>
      )}
    </motion.div>
  );
};

export default FeedbackDisplay;
