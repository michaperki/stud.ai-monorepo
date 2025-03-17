// src/components/StatusIndicator.js
import React from 'react';
import { motion } from 'framer-motion';
import { BsMic, BsCheckCircle, BsMicMute } from 'react-icons/bs';

const StatusIndicator = ({ recordingState }) => {
  // Different configurations based on state
  const stateConfig = {
    idle: {
      icon: <BsMic />,
      text: 'Ready',
      className: 'idle',
      animate: {}
    },
    recording: {
      icon: <BsMic />,
      text: 'Recording...',
      className: 'recording',
      animate: { 
        scale: [1, 1.1, 1],
        opacity: [1, 0.8, 1]
      }
    },
    recorded: {
      icon: <BsCheckCircle />,
      text: 'Recording Complete',
      className: 'recorded',
      animate: {}
    },
    'no-mic-mode': {
      icon: <BsMicMute />,
      text: 'No Microphone Mode',
      className: 'no-mic',
      animate: {}
    }
  };
  
  const config = stateConfig[recordingState] || stateConfig.idle;
  
  return (
    <motion.div 
      className={`status-indicator ${config.className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
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
