import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BsMic, BsMicMute } from 'react-icons/bs';
import LearningProgressChart from '../components/history/LearningProgressChart';

/**
 * Welcome screen displayed before session starts
 */
const WelcomeScreen = ({ 
  loading, 
  sessionHistory, 
  handleStartSession, 
  handleOpenDiagnostics, 
  microphoneAvailable 
}) => {
  const [showChart, setShowChart] = useState(false);
  
  // Only show chart after component has fully mounted
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowChart(true);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      setShowChart(false);
    };
  }, []);
  
  return (
    <motion.div 
      className="welcome-screen" 
      initial={{ scale: 0.9 }} 
      animate={{ scale: 1 }} 
      transition={{ type: "spring", stiffness: 300 }}
    >
      <h2>Welcome to Hebrew Word Practice</h2>
      <p>Practice your Hebrew pronunciation with instant feedback.</p>
      
      <button 
        className="button primary large" 
        onClick={handleStartSession} 
        disabled={loading}
      >
        {loading ? <span className="spinner"></span> : 'Start a New Session'}
      </button>
      
      <button
        className="button secondary"
        onClick={handleOpenDiagnostics}
        style={{ 
          marginTop: '1rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          justifyContent: 'center' 
        }}
      >
        {microphoneAvailable === false ? <BsMicMute /> : <BsMic />}
        Test Microphone
      </button>
      
      {microphoneAvailable === false && (
        <motion.div 
          className="mic-warning" 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.5 }}
        >
          <p>
            No microphone detected. You can still practice, but you'll need to 
            manually indicate if your pronunciation was correct.
          </p>
        </motion.div>
      )}
      
      {/* Learning progress visualization - only show when ready */}
      {sessionHistory.length > 0 && showChart && (
        <div className="progress-section">
          <h3>Your Learning Progress</h3>
          <LearningProgressChart sessionData={sessionHistory} />
        </div>
      )}
    </motion.div>
  );
};

export default WelcomeScreen;
