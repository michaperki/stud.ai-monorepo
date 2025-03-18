import React from 'react';
import HistoryDisplay from '../components/HistoryDisplay';
import SettingsPanel from '../components/SettingsPanel';
import VocabularySettings from '../components/VocabularySettings';
import EnhancedSessionStats from '../components/EnhancedSessionStats';

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
        <EnhancedSessionStats 
          session={state.session} 
          stats={state.stats} 
          history={state.history} 
        />
      }
    </div>
  );
};

export default Sidebar;
