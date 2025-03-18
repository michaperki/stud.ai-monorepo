// src/components/history/SessionStats.js
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BsBarChart, 
  BsCheck2Circle, 
  BsXCircle, 
  BsClock, 
  BsSpeedometer, 
  BsCalendar3,
  BsChevronDown, 
  BsChevronUp,
  BsArrowRepeat,
  BsLightbulb
} from 'react-icons/bs';

// Helper function to format time with safety checks
const formatTime = (seconds) => {
  if (seconds === undefined || seconds === null) {
    seconds = 0; // Default to 0 if undefined or null
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Displays detailed session statistics with expandable sections
 */
const SessionStats = ({ 
  session = {}, 
  stats = { totalWords: 0, correctWords: 0, incorrectAttempts: 0 }, 
  history = [],
  categoryStats = {} 
}) => {
  const [expanded, setExpanded] = useState(false);
  
  // Calculate additional statistics with safe access
  const totalWords = stats?.totalWords || 0;
  const incorrectAttempts = stats?.incorrectAttempts || 0;
  
  const accuracy = totalWords + incorrectAttempts > 0 
    ? Math.round((totalWords / (totalWords + incorrectAttempts)) * 100) 
    : 100;
  
  const averageAttemptsPerWord = totalWords > 0 
    ? ((totalWords + incorrectAttempts) / totalWords).toFixed(1) 
    : 0;
  
  const sessionTime = session?.time || 0;
  const wordsPerMinute = sessionTime > 60 
    ? (totalWords / (sessionTime / 60)).toFixed(1) 
    : totalWords;
  
  // Get today's date in a readable format
  const today = new Date().toLocaleDateString(undefined, { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Analysis of most challenging words based on retries
  const challengingWords = history.reduce((acc, item) => {
    if (!item.isCorrect) {
      if (!acc[item.word]) {
        acc[item.word] = 1;
      } else {
        acc[item.word]++;
      }
    }
    return acc;
  }, {});
  
  // Sort to find the most challenging words
  const topChallengingWords = Object.entries(challengingWords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  return (
    <div className="stats-section">
      <div className="section-header" onClick={() => setExpanded(!expanded)}>
        <h3>
          <BsBarChart className="section-icon" />
          Session Statistics
        </h3>
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
            className="stats-container"
          >
            <div className="stats-grid">
              {/* Basic Stats */}
              <div className="stats-group">
                <h4>Session Overview</h4>
                <div className="stat-row">
                  <div className="stat-icon"><BsClock /></div>
                  <div className="stat-content">
                    <div className="stat-label">Session Duration</div>
                    <div className="stat-value">{formatTime(sessionTime)}</div>
                  </div>
                </div>
                
                <div className="stat-row">
                  <div className="stat-icon"><BsCalendar3 /></div>
                  <div className="stat-content">
                    <div className="stat-label">Date</div>
                    <div className="stat-value">{today}</div>
                  </div>
                </div>
              </div>
              
              {/* Performance Stats */}
              <div className="stats-group">
                <h4>Performance</h4>
                <div className="stat-row">
                  <div className="stat-icon"><BsCheck2Circle style={{ color: 'var(--success-color)' }}/></div>
                  <div className="stat-content">
                    <div className="stat-label">Words Completed</div>
                    <div className="stat-value">{stats.totalWords}</div>
                  </div>
                </div>
                
                <div className="stat-row">
                  <div className="stat-icon"><BsXCircle style={{ color: 'var(--danger-color)' }}/></div>
                  <div className="stat-content">
                    <div className="stat-label">Incorrect Attempts</div>
                    <div className="stat-value">{stats.incorrectAttempts}</div>
                  </div>
                </div>
                
                <div className="stat-row">
                  <div className="stat-icon"><BsSpeedometer /></div>
                  <div className="stat-content">
                    <div className="stat-label">Words Per Minute</div>
                    <div className="stat-value">{wordsPerMinute}</div>
                  </div>
                </div>
              </div>
              
              {/* Accuracy Section */}
              <div className="stats-group full-width">
                <h4>Accuracy</h4>
                <div className="accuracy-meter">
                  <div 
                    className="accuracy-bar" 
                    style={{ 
                      width: `${accuracy}%`,
                      backgroundColor: accuracy > 80 
                        ? 'var(--success-color)' 
                        : accuracy > 60 
                        ? 'var(--warning-color)' 
                        : 'var(--danger-color)'
                    }}
                  />
                  <div className="accuracy-label">
                    <span>{accuracy}%</span>
                  </div>
                </div>
                
                <div className="stat-row">
                  <div className="stat-icon"><BsArrowRepeat /></div>
                  <div className="stat-content">
                    <div className="stat-label">Average Attempts per Word</div>
                    <div className="stat-value">{averageAttemptsPerWord}</div>
                  </div>
                </div>
              </div>
              
              {/* Most Challenging Words */}
              {topChallengingWords.length > 0 && (
                <div className="stats-group full-width">
                  <h4>Areas to Review</h4>
                  <div className="challenging-words">
                    {topChallengingWords.map(([word, count], index) => (
                      <div key={index} className="challenging-word-item">
                        <BsLightbulb style={{ color: 'var(--warning-color)' }} />
                        <span className="challenging-word">{word}</span>
                        <span className="challenging-count">
                          {count} {count === 1 ? 'retry' : 'retries'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Tips based on performance */}
            <div className="stats-tips">
              <h4>Learning Tips</h4>
              <div className="tips-content">
                {accuracy < 70 ? (
                  <p>
                    <strong>Try slowing down:</strong> Focus on mastering fewer words with better accuracy 
                    rather than rushing through many words.
                  </p>
                ) : accuracy > 90 ? (
                  <p>
                    <strong>Challenge yourself:</strong> You're doing great! Consider increasing 
                    the difficulty level of your words.
                  </p>
                ) : (
                  <p>
                    <strong>Good progress:</strong> Keep practicing consistently to maintain your 
                    learning momentum.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <style jsx>{`
        .stats-container {
          padding: 1rem;
          overflow-y: auto;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }
        
        .stats-group {
          background-color: rgba(var(--card-color-rgb), 0.5);
          border-radius: 8px;
          padding: 1rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .stats-group.full-width {
          grid-column: 1 / -1;
        }
        
        .stats-group h4 {
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 1rem;
          color: var(--text-color);
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          padding-bottom: 0.5rem;
        }
        
        .stat-row {
          display: flex;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        
        .stat-icon {
          min-width: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 0.75rem;
          color: var(--primary-color);
        }
        
        .stat-content {
          flex: 1;
        }
        
        .stat-label {
          font-size: 0.8rem;
          color: var(--text-light);
        }
        
        .stat-value {
          font-size: 1.2rem;
          font-weight: 600;
        }
        
        .accuracy-meter {
          height: 10px;
          background-color: rgba(0, 0, 0, 0.1);
          border-radius: 5px;
          overflow: hidden;
          position: relative;
          margin-bottom: 1rem;
        }
        
        .accuracy-bar {
          height: 100%;
          border-radius: 5px;
          transition: width 0.5s ease;
        }
        
        .accuracy-label {
          position: absolute;
          right: 0;
          top: -20px;
          font-size: 0.9rem;
          font-weight: 600;
        }
        
        .challenging-words {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .challenging-word-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background-color: rgba(0, 0, 0, 0.03);
          border-radius: 4px;
        }
        
        .challenging-word {
          font-weight: 600;
          flex: 1;
        }
        
        .challenging-count {
          font-size: 0.8rem;
          color: var(--text-light);
          background-color: rgba(0, 0, 0, 0.05);
          padding: 0.2rem 0.5rem;
          border-radius: 10px;
        }
        
        .stats-tips {
          margin-top: 1.5rem;
          background-color: rgba(var(--primary-color-rgb), 0.05);
          border-radius: 8px;
          padding: 1rem;
        }
        
        .stats-tips h4 {
          margin-top: 0;
          margin-bottom: 0.5rem;
          font-size: 1rem;
        }
        
        .tips-content p {
          margin: 0;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
};

export default SessionStats;
