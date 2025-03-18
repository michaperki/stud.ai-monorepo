import React, { useState } from 'react';
import { motion } from 'framer-motion';

// Simplified Chart Component that doesn't use Recharts
const LearningProgressChart = ({ sessionData = [] }) => {
  const [activeTab, setActiveTab] = useState('accuracy');
  
  // Process session data
  const processedData = sessionData.length > 0 
    ? sessionData.map((session, index) => {
        const totalAttempts = session.totalWords + session.incorrectAttempts;
        const accuracy = totalAttempts > 0 
          ? Math.round((session.totalWords / totalAttempts) * 100) 
          : 100;
        
        return {
          name: `Session ${index + 1}`,
          date: new Date(session.date).toLocaleDateString(),
          wordCount: session.totalWords,
          accuracy: accuracy,
          wordsPerMinute: session.wordsPerMinute || 0,
        };
      })
    : generateDemoData(); // Generate demo data if no real data
  
  // Generate demo data for demonstration
  function generateDemoData() {
    // Create sample data for 5 sessions
    return Array.from({ length: 5 }, (_, i) => ({
      name: `Session ${i + 1}`,
      date: new Date(Date.now() - (5 - i) * 86400000).toLocaleDateString(),
      wordCount: 10 + Math.floor(Math.random() * 20),
      accuracy: 70 + Math.floor(Math.random() * 25),
      wordsPerMinute: (2 + Math.random() * 3).toFixed(1)
    }));
  }
  
  // Find max values for scaling
  const maxAccuracy = Math.max(...processedData.map(d => d.accuracy), 100);
  const maxWords = Math.max(...processedData.map(d => d.wordCount), 30);
  const maxWPM = Math.max(...processedData.map(d => d.wordsPerMinute), 5);
  
  // Handle tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Render bar chart using styled divs
  const renderBarChart = (data, valueKey, color, max) => {
    return (
      <div className="simple-chart">
        {data.map((item, index) => (
          <div key={index} className="chart-row">
            <div className="chart-label" style={{ minWidth: '80px' }}>{item.name}</div>
            <div className="chart-bar-container" style={{ flex: 1, height: '24px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
              <div 
                className="chart-bar" 
                style={{ 
                  height: '100%', 
                  width: `${(item[valueKey] / max) * 100}%`, 
                  background: color, 
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: '8px',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  transition: 'width 0.5s ease'
                }}
              >
                {item[valueKey]}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render active chart based on tab
  const renderActiveChart = () => {
    switch (activeTab) {
      case 'accuracy':
        return renderBarChart(processedData, 'accuracy', '#06d6a0', maxAccuracy);
      case 'words':
        return renderBarChart(processedData, 'wordCount', '#4361ee', maxWords);
      case 'speed':
        return renderBarChart(processedData, 'wordsPerMinute', '#ef476f', maxWPM);
      default:
        return null;
    }
  };

  return (
    <div className="learning-progress-container" style={{ width: '100%' }}>
      {/* Tab navigation */}
      <div className="chart-tabs" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: '16px',
        borderBottom: '1px solid #eee',
        paddingBottom: '8px'
      }}>
        <button
          className={`tab-button ${activeTab === 'accuracy' ? 'active' : ''}`}
          onClick={() => handleTabChange('accuracy')}
          style={{
            margin: '0 8px',
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            background: activeTab === 'accuracy' ? '#4361ee' : '#f0f0f0',
            color: activeTab === 'accuracy' ? 'white' : 'black',
            cursor: 'pointer',
            fontWeight: activeTab === 'accuracy' ? 'bold' : 'normal'
          }}
        >
          Accuracy
        </button>
        <button
          className={`tab-button ${activeTab === 'words' ? 'active' : ''}`}
          onClick={() => handleTabChange('words')}
          style={{
            margin: '0 8px',
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            background: activeTab === 'words' ? '#4361ee' : '#f0f0f0',
            color: activeTab === 'words' ? 'white' : 'black',
            cursor: 'pointer',
            fontWeight: activeTab === 'words' ? 'bold' : 'normal'
          }}
        >
          Words Learned
        </button>
        <button
          className={`tab-button ${activeTab === 'speed' ? 'active' : ''}`}
          onClick={() => handleTabChange('speed')}
          style={{
            margin: '0 8px',
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            background: activeTab === 'speed' ? '#4361ee' : '#f0f0f0',
            color: activeTab === 'speed' ? 'white' : 'black',
            cursor: 'pointer',
            fontWeight: activeTab === 'speed' ? 'bold' : 'normal'
          }}
        >
          Words Per Minute
        </button>
      </div>
      
      {/* Chart area */}
      <motion.div 
        className="chart-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{ 
          height: 'auto', 
          padding: '16px', 
          background: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
      >
        <div className="chart-header" style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: 0, color: '#333' }}>
            {activeTab === 'accuracy' ? 'Pronunciation Accuracy' : 
             activeTab === 'words' ? 'Words Completed' : 
             'Learning Speed'}
          </h4>
          <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
            {activeTab === 'accuracy' ? 'Percentage of words pronounced correctly' : 
             activeTab === 'words' ? 'Number of words completed in each session' : 
             'Average words completed per minute'}
          </p>
        </div>
        
        {renderActiveChart()}
      </motion.div>
      
      {/* Legend */}
      <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginTop: '16px', 
          fontSize: '0.9rem'
        }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ 
            display: 'inline-block', 
            width: '12px', 
            height: '12px', 
            backgroundColor: activeTab === 'accuracy' ? '#06d6a0' : 
                              activeTab === 'words' ? '#4361ee' : '#ef476f', 
            marginRight: '4px' 
          }}></span>
          {activeTab === 'accuracy' ? 'Accuracy %' : 
           activeTab === 'words' ? 'Words Count' : 
           'Words Per Minute'}
        </span>
      </div>
    </div>
  );
};

export default LearningProgressChart;
