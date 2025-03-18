import { useReducer, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { appReducer, initialState } from '../reducers/appReducer';

/**
 * Custom hook for managing app state and related actions
 */
export const useAppState = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load saved settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      try {
        dispatch({ type: 'SET_SETTINGS', payload: JSON.parse(savedSettings) });
      } catch (e) {
        console.error('Failed to parse saved settings:', e);
      }
    }
  }, []);

  // API error handler
  const handleApiError = useCallback((error, message) => {
    const errorMessage = error.response?.data?.detail || message || 'Server error';
    dispatch({ type: 'SET_ERROR', payload: errorMessage });
    toast.error(errorMessage);
  }, []);

  // Settings handlers
  const handleUpdateSettings = useCallback((newSettings) => {
    dispatch({ type: 'SET_SETTINGS', payload: newSettings });
    localStorage.setItem('appSettings', JSON.stringify({ ...state.settings, ...newSettings }));
  }, [state.settings]);

  const handleVocabularySettings = useCallback((vocabSettings) => {
    dispatch({ 
      type: 'SET_SETTINGS', 
      payload: { 
        wordCategory: vocabSettings.wordCategory, 
        difficultyLevel: vocabSettings.difficultyLevel 
      } 
    });
    localStorage.setItem('appSettings', JSON.stringify({ ...state.settings, ...vocabSettings }));
  }, [state.settings]);

  const handleChangeLanguage = useCallback((newLang) => {
    dispatch({ type: 'SET_SETTINGS', payload: { promptLanguage: newLang } });
  }, []);

  return {
    state,
    dispatch,
    handleApiError,
    handleUpdateSettings,
    handleVocabularySettings,
    handleChangeLanguage
  };
};
