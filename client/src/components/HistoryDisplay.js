// src/components/HistoryDisplay.js
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BsCheckCircle, BsXCircle, BsChevronDown, BsChevronUp } from 'react-icons/bs';

const HistoryDisplay = ({ history }) => {
  const [expanded, setExpanded] = useState(true);
  
  if (!history || history.length === 0) {
    return null;
  }
  
  const toggleExpanded = () => setExpanded(!expanded);
  
  return (
    <div className="history-section">
      <div className="section-header" onClick={toggleExpanded}>
        <h3>History</h3>
        <button className="toggle-button">
          {expanded ? <BsChevronUp /> : <BsChevronDown />}
        </button>
      </div>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="history-container"
          >
            <div className="history-list">
              {history.map((item, idx) => (
                <motion.div 
                  key={idx}
                  className="history-item"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.3 }}
                >
                  <div className="history-icon">
                    {item.isCorrect ? (
                      <BsCheckCircle className="icon-correct" />
                    ) : (
                      <BsXCircle className="icon-incorrect" />
                    )}
                  </div>
                  
                  <div className="history-content">
                    <div className="history-word">{item.word}</div>
                    <div className="history-response">{item.userResponse}</div>
                  </div>
                  
                  <div className="history-time">
                    {new Date(item.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HistoryDisplay;
