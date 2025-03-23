// src/components/feedback/StatusIndicator.js
import React from 'react';
import { motion } from 'framer-motion';
import { BsMic, BsCheckCircle, BsMicMute, BsClock } from 'react-icons/bs';

/**
 * Displays the current recording status with appropriate icons and animations
 */
const StatusIndicator = ({ recordingState, feedbackVisible = false }) => {
  // Don't show anything if feedback is visible
  if (feedbackVisible) {
    return null;
  }
  
  // Different configurations based on state
  const stateConfig = {
    idle: {
      icon: <BsMic size={16} />,
      text: 'Ready',
      className: 'idle',
      animate: {}
    },
    recording: {
      icon: <BsMic size={16} />,
      text: 'Recording...',
      className: 'recording',
      animate: { 
        scale: [1, 1.1, 1],
        opacity: [1, 0.8, 1]
      }
    },
    recorded: {
      icon: <BsCheckCircle size={16} />,
      text: 'Recording Complete',
      className: 'recorded',
      animate: {}
    },
    'no-mic-mode': {
      icon: <BsMicMute size={16} />,
      text: 'No Microphone Mode',
      className: 'no-mic',
      animate: {}
    },
    processing: {
      icon: <BsClock size={16} />,
      text: 'Processing...',
      className: 'idle',
      animate: {
        rotate: [0, 360],
        transition: { 
          repeat: Infinity,
          duration: 2
        }
      }
    }
  };
  
  // Default to idle if state not found
  const config = stateConfig[recordingState] || stateConfig.idle;
  
  return (
    <motion.div 
      className={`status-indicator ${config.className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
      layout="position"
    >
      <motion.div 
        className="status-icon"
        animate={config.animate}
        transition={{ 
          repeat: recordingState === 'recording' ? Infinity : 0,
          duration: 1.5 
        }}
      >
        {config.icon}
      </motion.div>
      <span className="status-text">{config.text}</span>
    </motion.div>
  );
};

export default StatusIndicator;
