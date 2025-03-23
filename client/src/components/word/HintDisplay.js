// src/components/word/HintDisplay.js
import React from 'react';
import { motion } from 'framer-motion';
import { BsLightbulb, BsVolumeUp, BsPuzzle, BsType, BsTag } from 'react-icons/bs';

/**
 * Displays progressive hints for words based on attempt count
 */
const HintDisplay = ({ hint }) => {
  if (!hint) return null;
  
  // Get appropriate icon based on hint type
  const getHintIcon = (type) => {
    switch (type) {
      case 'phonetic':
        return <BsVolumeUp size={16} />;
      case 'scrambled':
        return <BsPuzzle size={16} />;
      case 'length':
        return <BsType size={16} />;
      case 'category':
        return <BsTag size={16} />;
      default:
        return <BsLightbulb size={16} />;
    }
  };
  
  const icon = getHintIcon(hint.type);
  
  return (
    <motion.div 
      className={`hint-container ${hint.type || 'default'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <div className="hint-icon">
        {icon}
      </div>
      <div className="hint-text">
        {hint.text}
      </div>
    </motion.div>
  );
};

export default HintDisplay;
