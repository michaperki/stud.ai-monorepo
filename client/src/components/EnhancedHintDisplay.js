// src/components/EnhancedHintDisplay.js
import React from 'react';
import { motion } from 'framer-motion';
import { BsLightbulb, BsVolumeUp, BsPuzzle, BsType, BsTag } from 'react-icons/bs';

const EnhancedHintDisplay = ({ hint }) => {
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
  
  // Get hint color based on type (can be customized to match your theme)
  const getHintColor = (type) => {
    switch (type) {
      case 'phonetic':
        return 'rgb(250, 204, 21)'; // yellow
      case 'scrambled':
        return 'rgb(99, 102, 241)'; // indigo
      case 'first_letter':
        return 'rgb(16, 185, 129)'; // emerald
      case 'almost_full':
        return 'rgb(239, 68, 68)'; // red
      default:
        return 'rgb(234, 179, 8)'; // amber
    }
  };
  
  const hintIcon = getHintIcon(hint.type);
  const hintColor = getHintColor(hint.type);
  
  return (
    <motion.div 
      className="enhanced-hint-container"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        backgroundColor: `${hintColor}15`, // 15% opacity
        borderLeft: `4px solid ${hintColor}`,
        borderRadius: '6px',
        width: '100%',
        maxWidth: '500px',
        margin: '0.5rem 0',
      }}
    >
      <div className="hint-icon" style={{ color: hintColor }}>
        {hintIcon}
      </div>
      <div className="hint-text" style={{ flex: 1 }}>
        {hint.text}
      </div>
    </motion.div>
  );
};

export default EnhancedHintDisplay;
