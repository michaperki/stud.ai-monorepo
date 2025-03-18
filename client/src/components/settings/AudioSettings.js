// src/components/AudioSettings.js
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BsVolumeUp, BsVolumeDown, BsClock } from 'react-icons/bs';

const AudioSettings = ({ 
  audioSettings,
  onUpdateSettings,
  expanded = false
}) => {
  const [settingsExpanded, setSettingsExpanded] = useState(expanded);
  const [localSettings, setLocalSettings] = useState(audioSettings || {
    silenceThreshold: 15,
    silenceDuration: 1000,
    minRecordingTime: 500,
    maxRecordingTime: 8000
  });

  const handleSliderChange = (settingName, value) => {
    const newSettings = { ...localSettings, [settingName]: value };
    setLocalSettings(newSettings);
    if (onUpdateSettings) {
      onUpdateSettings(newSettings);
    }
  };

  const resetToDefaults = () => {
    const defaults = {
      silenceThreshold: 15,
      silenceDuration: 1000,
      minRecordingTime: 500,
      maxRecordingTime: 8000
    };
    setLocalSettings(defaults);
    if (onUpdateSettings) {
      onUpdateSettings(defaults);
    }
  };

  return (
    <div className="audio-settings-section">
      <div className="section-header" onClick={() => setSettingsExpanded(!settingsExpanded)}>
        <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BsVolumeUp /> Audio Sensitivity Settings
        </h4>
        <button className="toggle-button">
          {settingsExpanded ? '−' : '+'}
        </button>
      </div>

      {settingsExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="audio-settings-controls"
          style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          <div className="setting-item">
            <div className="setting-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label htmlFor="silenceThreshold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BsVolumeDown /> Silence Threshold: <b>{localSettings.silenceThreshold}</b>
              </label>
              <div className="setting-value" style={{ fontSize: '0.9rem', color: '#666' }}>
                {localSettings.silenceThreshold <= 10 ? "More sensitive" : 
                 localSettings.silenceThreshold >= 25 ? "Less sensitive" : "Balanced"}
              </div>
            </div>
            <input
              id="silenceThreshold"
              type="range"
              min="5"
              max="35"
              step="1"
              value={localSettings.silenceThreshold}
              onChange={(e) => handleSliderChange('silenceThreshold', parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
            <div className="setting-description" style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
              Lower values detect silence more easily (stops recording faster when you're done speaking)
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label htmlFor="silenceDuration" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BsClock /> Wait Time: <b>{(localSettings.silenceDuration / 1000).toFixed(1)}s</b>
              </label>
              <div className="setting-value" style={{ fontSize: '0.9rem', color: '#666' }}>
                {localSettings.silenceDuration <= 750 ? "Quick stop" : 
                 localSettings.silenceDuration >= 1500 ? "Long pause" : "Medium pause"}
              </div>
            </div>
            <input
              id="silenceDuration"
              type="range"
              min="500"
              max="2000"
              step="100"
              value={localSettings.silenceDuration}
              onChange={(e) => handleSliderChange('silenceDuration', parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
            <div className="setting-description" style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
              How long to wait (in seconds) before stopping after detecting silence
            </div>
          </div>

          <div className="settings-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button 
              onClick={resetToDefaults}
              className="button secondary"
              style={{ fontSize: '0.9rem', padding: '0.5rem 0.75rem' }}
            >
              Reset to Defaults
            </button>
          </div>

          <div className="settings-tip" style={{ 
            backgroundColor: 'rgba(67, 97, 238, 0.1)', 
            padding: '0.75rem', 
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}>
            <p style={{ margin: 0 }}><strong>Tip:</strong> If recording stops too quickly before you finish speaking, increase the silence threshold or wait time. If it waits too long after you finish speaking, decrease these values.</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AudioSettings;
