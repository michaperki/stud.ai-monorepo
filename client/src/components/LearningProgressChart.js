import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { motion } from 'framer-motion';

const LearningProgressChart = ({ sessionData = [], wordCategories = [] }) => {
  const [activeTab, setActiveTab] = useState('accuracy');
  const [chartData, setChartData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  // Process session data for charts when it changes
  useEffect(() => {
    if (!sessionData || sessionData.length === 0) {
      // Demo data if no real data is available
      const demoData = generateDemoData();
      setChartData(demoData.progressData);
      setCategoryData(demoData.categoryData);
      return;
    }

    // Process real session data
    const processedData = sessionData.map((session, index) => {
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
        sessionMinutes: Math.round(session.duration / 60) || 0
      };
    });
    
    setChartData(processedData);

    // Process category data if available
    if (wordCategories && wordCategories.length > 0) {
      const catData = wordCategories.map(cat => ({
        name: cat.name,
        count: cat.count,
        mastery: cat.mastery || Math.floor(Math.random() * 100)
      }));
      setCategoryData(catData);
    }
  }, [sessionData, wordCategories]);

  // Generate demo data for illustration
  const generateDemoData = () => {
    // Progress data - simulate 7 days of learning
    const progressData = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      
      // Create some realistic patterns
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // People tend to practice less on weekends
      const wordCount = isWeekend 
        ? 10 + Math.floor(Math.random() * 15) 
        : 15 + Math.floor(Math.random() * 15);
      
      // Accuracy improves over time with some variation
      const baseAccuracy = 70 + i * 3; // Gradually improves
      const accuracy = Math.min(98, baseAccuracy + Math.floor(Math.random() * 10 - 5));
      
      // Words per minute might improve slightly
      const wordsPerMinute = 4 + (i * 0.3) + Math.random();
      
      progressData.push({
        name: date.toLocaleDateString(undefined, { weekday: 'short' }),
        date: date.toLocaleDateString(),
        wordCount,
        accuracy,
        wordsPerMinute: wordsPerMinute.toFixed(1),
        sessionMinutes: 10 + Math.floor(Math.random() * 10)
      });
    }
    
    // Category data
    const categories = [
      'Nouns', 'Verbs', 'Adjectives', 'Phrases', 
      'Greetings', 'Numbers', 'Questions'
    ];
    
    const categoryData = categories.map(cat => ({
      name: cat,
      count: 5 + Math.floor(Math.random() * 30),
      mastery: Math.floor(Math.random() * 100)
    }));
    
    return { progressData, categoryData };
  };

  // Handle tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}>
          <p className="label" style={{ margin: '0 0 5px 0' }}>{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} style={{ 
              margin: '2px 0',
              color: entry.color
            }}>
              {`${entry.name}: ${entry.value}${entry.name === 'Accuracy' ? '%' : ''}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
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
          className={`tab-button ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => handleTabChange('categories')}
          style={{
            margin: '0 8px',
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            background: activeTab === 'categories' ? '#4361ee' : '#f0f0f0',
            color: activeTab === 'categories' ? 'white' : 'black',
            cursor: 'pointer',
            fontWeight: activeTab === 'categories' ? 'bold' : 'normal'
          }}
        >
          Categories
        </button>
      </div>
      
      {/* Chart area */}
      <motion.div 
        className="chart-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{ height: '300px' }}
      >
        {activeTab === 'accuracy' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis 
                domain={[0, 100]}
                label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="accuracy" 
                name="Accuracy" 
                stroke="#06d6a0" 
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        
        {activeTab === 'words' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis 
                label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="wordCount" 
                name="Words Learned" 
                stroke="#4361ee" 
                activeDot={{ r: 8 }} 
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="wordsPerMinute" 
                name="Words Per Minute" 
                stroke="#ef476f" 
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        
        {activeTab === 'categories' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={categoryData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="count" name="Words Count" fill="#4361ee" />
              <Bar dataKey="mastery" name="Mastery %" fill="#ffd166" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>
      
      {/* Legend for category colors */}
      {activeTab === 'categories' && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginTop: '16px', 
          fontSize: '0.9rem'
        }}>
          <span style={{ marginRight: '16px' }}>
            <span style={{ 
              display: 'inline-block', 
              width: '12px', 
              height: '12px', 
              backgroundColor: '#4361ee', 
              marginRight: '4px' 
            }}></span>
            Word Count
          </span>
          <span>
            <span style={{ 
              display: 'inline-block', 
              width: '12px', 
              height: '12px', 
              backgroundColor: '#ffd166', 
              marginRight: '4px' 
            }}></span>
            Mastery Level
          </span>
        </div>
      )}
    </div>
  );
};

export default LearningProgressChart;
