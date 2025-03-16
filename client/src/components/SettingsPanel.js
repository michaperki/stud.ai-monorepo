
// src/components/SettingsPanel.js
import React from 'react';

export default function SettingsPanel({ promptLanguage, onChangeLanguage }) {
  return (
    <div
      style={{
        border: '1px solid #ccc',
        padding: '1rem',
        borderRadius: '8px',
        marginTop: '1rem',
        maxWidth: '300px',
      }}
    >
      <h3>Settings</h3>
      <div style={{ marginBottom: '0.5rem' }}>Prompt Language:</div>
      <select 
        value={promptLanguage} 
        onChange={(e) => onChangeLanguage(e.target.value)}
      >
        <option value="iw">Hebrew (iw)</option>
        <option value="en">English (en)</option>
      </select>
    </div>
  );
}
