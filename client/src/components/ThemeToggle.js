// src/components/ThemeToggle.js
import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { BsSun, BsMoon } from 'react-icons/bs';
import { ThemeContext } from '../contexts/ThemeContext';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  
  return (
    <motion.button
      className="theme-toggle-button"
      onClick={toggleTheme}
      whileTap={{ scale: 0.95 }}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.5rem',
        borderRadius: '50%',
        color: 'var(--text-color)',
        backgroundColor: 'var(--card-color)',
        boxShadow: 'var(--shadow)',
        position: 'relative',
        width: '2.5rem',
        height: '2.5rem',
        overflow: 'hidden'
      }}
    >
      <motion.div
        animate={{ 
          rotateZ: theme === 'dark' ? 180 : 0,
          opacity: theme === 'dark' ? 0 : 1
        }}
        transition={{ duration: 0.3 }}
        style={{ position: 'absolute' }}
      >
        <BsSun size={18} />
      </motion.div>
      
      <motion.div
        animate={{ 
          rotateZ: theme === 'light' ? -180 : 0,
          opacity: theme === 'light' ? 0 : 1
        }}
        transition={{ duration: 0.3 }}
        style={{ position: 'absolute' }}
      >
        <BsMoon size={18} />
      </motion.div>
    </motion.button>
  );
};

export default ThemeToggle;
