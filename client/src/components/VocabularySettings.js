// src/components/VocabularySettings.js
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BsBook, BsChevronDown, BsChevronUp, BsTag, BsBarChart } from 'react-icons/bs';
import * as api from '../services/api';

const VocabularySettings = ({ 
  onUpdateSettings,
  currentSettings = {}
}) => {
  const [expanded, setExpanded] = useState(false);
  const [categories, setCategories] = useState([]);
  const [difficultyLevels, setDifficultyLevels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [localSettings, setLocalSettings] = useState({
    wordCategory: currentSettings.wordCategory || '',
    difficultyLevel: currentSettings.difficultyLevel || '',
  });

  // Fetch vocabulary metadata when component mounts
  useEffect(() => {
    const fetchVocabularyMetadata = async () => {
      setLoading(true);
      try {
        // Get categories
        const categoriesResponse = await api.getVocabularyCategories();
        if (categoriesResponse && categoriesResponse.categories) {
          setCategories(categoriesResponse.categories);
        }
        
        // Get difficulty levels
        const difficultyResponse = await api.getVocabularyDifficultyLevels();
        if (difficultyResponse && difficultyResponse.difficulty_levels) {
          setDifficultyLevels(difficultyResponse.difficulty_levels);
        }
      } catch (error) {
        console.error('Error fetching vocabulary metadata:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchVocabularyMetadata();
  }, []);

  // Handle toggle expanded
  const toggleExpanded = () => setExpanded(!expanded);
  
  // Handle setting changes
  const handleSettingChange = (setting, value) => {
    const updatedSettings = { ...localSettings, [setting]: value };
    setLocalSettings(updatedSettings);
    
    // Notify parent component
    if (onUpdateSettings) {
      onUpdateSettings(updatedSettings);
    }
  };

  // Format label with proper capitalization
  const formatLabel = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).replace('_', ' ');
  };

  return (
    <div className="vocabulary-settings-section">
      <div className="section-header" onClick={toggleExpanded}>
        <h3>
          <BsBook className="section-icon" />
          Vocabulary Settings
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
            className="settings-container"
          >
            {loading ? (
              <div className="settings-loading">
                <div className="spinner"></div>
                <p>Loading vocabulary settings...</p>
              </div>
            ) : (
              <>
                {/* Word Category Selection */}
                <div className="settings-group">
                  <label className="settings-label" htmlFor="wordCategory">
                    <BsTag className="settings-icon" />
                    Word Category:
                  </label>
                  <select 
                    id="wordCategory"
                    className="settings-select"
                    value={localSettings.wordCategory} 
                    onChange={(e) => handleSettingChange('wordCategory', e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {formatLabel(category)}
                      </option>
                    ))}
                  </select>
                  <div className="settings-description">
                    Filter words by grammatical category (nouns, verbs, adjectives, etc.)
                  </div>
                </div>

                {/* Difficulty Level Selection */}
                <div className="settings-group">
                  <label className="settings-label" htmlFor="difficultyLevel">
                    <BsBarChart className="settings-icon" />
                    Difficulty Level:
                  </label>
                  <select 
                    id="difficultyLevel"
                    className="settings-select"
                    value={localSettings.difficultyLevel} 
                    onChange={(e) => handleSettingChange('difficultyLevel', e.target.value)}
                  >
                    <option value="">All Levels</option>
                    {difficultyLevels.map(level => (
                      <option key={level} value={level}>
                        {formatLabel(level)}
                      </option>
                    ))}
                  </select>
                  <div className="settings-description">
                    Choose words based on difficulty (beginner, intermediate, advanced)
                  </div>
                </div>
                
                <div className="settings-info">
                  <p>
                    <strong>Vocabulary Tips:</strong> Select a category and difficulty level to focus on specific word types during your practice session. Categories help you learn related words, while difficulty levels adjust to your current Hebrew proficiency.
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VocabularySettings;
