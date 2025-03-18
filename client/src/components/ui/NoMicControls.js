// src/components/ui/NoMicControls.js
import React from 'react';
import { motion } from 'framer-motion';
import { BsCheckCircle, BsXCircle, BsVolumeUp } from 'react-icons/bs';

/**
 * Alternative controls for users without microphones
 */
const NoMicControls = ({ 
  onCorrect, 
  onIncorrect, 
  onReplayTts, 
  loading, 
  sessionPaused 
}) => {
  return (
    <motion.div
      className="no-mic-controls"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="no-mic-info">
        <p>Practice without microphone mode. Please indicate whether you pronounced the word correctly:</p>
      </div>
      
      <div className="no-mic-buttons">
        <motion.button
          className="button primary no-mic-button"
          onClick={onCorrect}
          disabled={loading || sessionPaused}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <BsCheckCircle size={20} />
          <span>I Said It Correctly</span>
        </motion.button>
        
        <motion.button
          className="button secondary no-mic-button"
          onClick={onIncorrect}
          disabled={loading || sessionPaused}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <BsXCircle size={20} />
          <span>I Made a Mistake</span>
        </motion.button>
        
        <motion.button
          className="button outline no-mic-button"
          onClick={onReplayTts}
          disabled={loading || sessionPaused}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <BsVolumeUp size={20} />
          <span>Replay Pronunciation</span>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default NoMicControls;
