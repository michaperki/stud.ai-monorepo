import React from 'react';
import HistoryDisplay from '../components/history/HistoryDisplay';
import SettingsPanel from '../components/settings/SettingsPanel';
import VocabularySettings from '../components/settings/VocabularySettings';
import SessionStats from '../components/history/SessionStats';

/**
 * Sidebar component containing history, settings and session stats
 */
const Sidebar = ({
  state,
  handleUpdateSettings,
  handleVocabularySettings,
  handleChangeLanguage,
  audioSettings,
  handleUpdateAudioSettings
}) => {
  return (
    <div className="app-sidebar">
      <HistoryDisplay history={state.history} />
      
      <SettingsPanel
        promptLanguage={state.settings.promptLanguage}
        onChangeLanguage={handleChangeLanguage}
        audioSettings={audioSettings}
        onUpdateAudioSettings={handleUpdateAudioSettings}
        autoAdvanceDelay={state.settings.autoAdvanceDelay}
        onUpdateSettings={handleUpdateSettings}
      />
      
      <VocabularySettings
        onUpdateSettings={handleVocabularySettings}
        currentSettings={{ 
          wordCategory: state.settings.wordCategory, 
          difficultyLevel: state.settings.difficultyLevel 
        }}
      />
      
      {state.session.active && 
        <SessionStats 
          session={state.session} 
          stats={state.stats} 
          history={state.history} 
        />
      }
    </div>
  );
};

export default Sidebar;
