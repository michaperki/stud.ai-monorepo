// src/components/WordDisplay.js
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BsVolumeUp } from 'react-icons/bs';

const WordDisplay = ({ 
  word, 
  ttsAudio, 
  onReplayTts, 
  loading, 
  sessionPaused,
  hint
}) => {
  if (!word) return null;
  
  return (
    <motion.div 
      className="word-display-container"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="word-display">
        <h2>{word}</h2>
        
        {ttsAudio && (
          <motion.button
            className="button circle secondary"
            onClick={onReplayTts}
            disabled={loading || sessionPaused}
            whileTap={{ scale: 0.95 }}
            title="Replay pronunciation"
          >
            <BsVolumeUp size={20} />
          </motion.button>
        )}
      </div>
      
      <AnimatePresence>
        {hint && (
          <motion.div 
            className="hint-container"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {hint}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WordDisplay;
