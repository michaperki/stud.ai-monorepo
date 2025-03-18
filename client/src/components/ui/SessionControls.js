// src/components/ui/SessionControls.js
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BsPlayFill, BsPauseFill, BsStopFill } from 'react-icons/bs';
import { useSession } from '../../contexts/SessionContext';

/**
 * Controls for managing an active session (pause/resume/end)
 */
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const SessionControls = ({ 
  sessionTime, 
  isPaused, 
  onTogglePause, 
  onEndSession 
}) => {
  const { stats } = useSession();
  const formattedTime = useMemo(() => formatTime(sessionTime), [sessionTime]);
  
  // Calculate accuracy percentage
  const accuracy = useMemo(() => {
    if (stats.totalWords === 0 && stats.incorrectAttempts === 0) return 100;
    const totalAttempts = stats.totalWords + stats.incorrectAttempts;
    return totalAttempts > 0 
      ? Math.round((stats.totalWords / totalAttempts) * 100) 
      : 0;
  }, [stats]);
  
  return (
    <motion.div 
      className="session-controls"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="session-stats">
        <div className="stat-item">
          <span className="stat-label">Time</span>
          <span className="stat-value">{formattedTime}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Words</span>
          <span className="stat-value">{stats.totalWords}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Accuracy</span>
          <span className="stat-value">{accuracy}%</span>
        </div>
      </div>
      
      <div className="session-buttons">
        <motion.button 
          className={`button circle ${isPaused ? 'primary' : 'secondary'}`}
          onClick={onTogglePause}
          whileTap={{ scale: 0.95 }}
          title={isPaused ? 'Resume session' : 'Pause session'}
        >
          {isPaused ? <BsPlayFill size={18} /> : <BsPauseFill size={18} />}
        </motion.button>
        
        <motion.button 
          className="button circle danger"
          onClick={onEndSession}
          whileTap={{ scale: 0.95 }}
          title="End session"
        >
          <BsStopFill size={18} />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default SessionControls;
