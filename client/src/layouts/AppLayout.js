import React from 'react';
import { motion } from 'framer-motion';
import ThemeToggle from '../components/settings/ThemeToggle';
import SessionControls from '../components/ui/SessionControls';

/**
 * Main application layout with header and content areas
 */
const AppLayout = ({ 
  children, 
  state, 
  togglePauseSession, 
  handleEndSession,
  sessionContextValue 
}) => {
  // Safeguard against invalid session state
  const isSessionActive = state?.session?.active;
  
  return (
    <motion.div 
      className="app-container" 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      layout
    >
      <header className="app-header">
        <motion.h1 
          className="app-title" 
          layout
        >
          Hebrew Word Practice
        </motion.h1>
        <motion.div 
          className="app-controls"
          layout
        >
          {isSessionActive && (
            <SessionControls
              sessionTime={state.session.time || 0}
              isPaused={state.session.paused || false}
              onTogglePause={togglePauseSession}
              onEndSession={handleEndSession}
            />
          )}
          <ThemeToggle />
        </motion.div>
      </header>

      {state?.error && (
        <motion.div 
          className="error-message" 
          initial={{ height: 0, opacity: 0 }} 
          animate={{ height: 'auto', opacity: 1 }} 
          exit={{ height: 0, opacity: 0 }}
          layout
        >
          {state.error}
        </motion.div>
      )}

      <motion.main 
        className="app-content"
        layout
      >
        {children}
      </motion.main>
    </motion.div>
  );
};

export default AppLayout;
