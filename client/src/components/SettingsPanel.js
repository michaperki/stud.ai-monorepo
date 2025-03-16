// src/components/SettingsPanel.js
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BsChevronDown, BsChevronUp, BsGear } from 'react-icons/bs';
import AudioSettings from './AudioSettings';

export default function SettingsPanel({ 
  promptLanguage, 
  onChangeLanguage, 
  audioSettings,
  onUpdateAudioSettings
}) {
  const [expanded, setExpanded] = useState(false);
  
  const toggleExpanded = () => setExpanded(!expanded);
  
  return (
    <div className="settings-section">
      <div className="section-header" onClick={toggleExpanded}>
        <h3>
          <BsGear className="section-icon" />
          Settings
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
            <div className="settings-group">
              <label className="settings-label" htmlFor="promptLanguage">
                Prompt Language:
              </label>
              <select 
                id="promptLanguage"
                className="settings-select"
                value={promptLanguage} 
                onChange={(e) => onChangeLanguage(e.target.value)}
              >
                <option value="iw">Hebrew (iw)</option>
                <option value="en">English (en)</option>
              </select>
            </div>
            
            {/* Add audio settings component */}
            {audioSettings && (
              <AudioSettings 
                audioSettings={audioSettings}
                onUpdateSettings={onUpdateAudioSettings}
                expanded={false}
              />
            )}
            
            <div className="settings-info">
              <p>
                <strong>Tip:</strong> The "Hebrew" option will give you Hebrew words 
                to pronounce, while "English" will give you English words to practice.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
