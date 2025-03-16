// src/components/FeedbackDisplay.js
import React from 'react';
import { motion } from 'framer-motion';
import { BsCheckCircleFill, BsXCircleFill, BsArrowRightCircle, BsXCircle, BsMic, BsVolumeUp } from 'react-icons/bs';

const FeedbackDisplay = ({ feedback, loading, onNextWord, sessionPaused, onPlayCorrectPronunciation }) => {
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="feedback-value">{feedback.correct_answer}</span>
            <motion.button
              className="button circle secondary"
              onClick={onPlayCorrectPronunciation}
              disabled={loading || sessionPaused}
              whileTap={{ scale: 0.95 }}
              title="Play correct pronunciation"
              style={{ minWidth: 'auto', padding: '0.25rem' }}
            >
              <BsVolumeUp size={16} />
            </motion.button>
          </div>
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
      
      <div className="feedback-buttons">
        {isCorrect ? (
          <motion.button
            className="button primary feedback-button"
            onClick={onNextWord}
            disabled={loading || sessionPaused}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>Next Word</span>
            <BsArrowRightCircle size={18} />
          </motion.button>
        ) : (
          <>
            <motion.button
              className="button secondary feedback-button"
              onClick={() => window.dispatchEvent(new CustomEvent('retry-pronunciation'))}
              disabled={loading || sessionPaused}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>Try Again</span>
              <BsMic size={18} />
            </motion.button>
            <motion.button
              className="button outline feedback-button"
              onClick={onNextWord}
              disabled={loading || sessionPaused}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>Skip This Word</span>
              <BsArrowRightCircle size={18} />
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default FeedbackDisplay;
