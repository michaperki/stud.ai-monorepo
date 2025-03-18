import React, { useState, useEffect, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';

// Component imports
import AppLayout from './layouts/AppLayout';
import WelcomeScreen from './containers/WelcomeScreen';
import PracticeArea from './containers/PracticeArea';
import Sidebar from './containers/Sidebar';
import MicrophoneErrorModal from './components/modals/MicrophoneErrorModal';
import MicrophoneDiagnostics from './components/audio/MicrophoneDiagnostics';

// Context providers
import { SessionProvider } from './contexts/SessionContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Custom hooks
import { useAppState } from './hooks/useAppState';
import { useSessionManager } from './hooks/useSessionManager';
import { useMicrophoneManager } from './hooks/useMicrophoneManager';

// API service
import * as api from './services/api';

// CSS
import './App.css';

export default function App() {
  // State management using custom hook
  const { 
    state, 
    dispatch, 
    handleApiError, 
    handleUpdateSettings,
    handleVocabularySettings,
    handleChangeLanguage
  } = useAppState();

  // Microphone diagnostics state
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [userRecordingUrl, setUserRecordingUrl] = useState(null);

  // Microphone and recording management
  const { 
    microphoneAvailable,
    isRecording,
    stream,
    audioSettings,
    handleMicrophoneError,
    startRecording,
    stopRecording,
    retryMicrophoneAccess,
    handleUpdateAudioSettings
  } = useMicrophoneManager({
    state,
    dispatch,
    handleApiError,
    setUserRecordingUrl
  });

  // Session management logic
  const {
    sessionContextValue,
    handleStartSession,
    handleGetWordWithoutMic,
    handleNextWord,
    togglePauseSession,
    handleReplayTts,
    handleEndSession,
  } = useSessionManager({
    state,
    dispatch,
    startRecording,
    handleMicrophoneError,
    handleApiError,
    microphoneAvailable,
    userRecordingUrl,
    setUserRecordingUrl
  });

  // Cleanup function for user recording URL
  useEffect(() => {
    return () => {
      if (userRecordingUrl) {
        try {
          URL.revokeObjectURL(userRecordingUrl);
        } catch (error) {
          console.error('Error cleaning up user recording URL:', error);
        }
      }
    };
  }, [userRecordingUrl]);

  // Error modal handlers
  const handleOpenDiagnostics = useCallback(() => {
    dispatch({ 
      type: 'SET_MICROPHONE_ERROR', 
      payload: { isOpen: true, message: 'Test your microphone before starting a session.', isCritical: false }
    });
    setShowDiagnostics(true);
  }, [dispatch]);

  const handleCloseErrorModal = useCallback(() => {
    if (retryMicrophoneAccess) {
      retryMicrophoneAccess().catch(err => console.warn("Retry microphone access failed:", err));
    }
    dispatch({ type: 'SET_MICROPHONE_ERROR', payload: { isOpen: false } });
    setShowDiagnostics(false);
  }, [dispatch, retryMicrophoneAccess]);

  const handleContinueWithoutMic = useCallback(() => {
    dispatch({ type: 'SET_PRACTICE_WITHOUT_MIC', payload: true });
    dispatch({ type: 'SET_MICROPHONE_ERROR', payload: { isOpen: false } });
    setShowDiagnostics(false);
    if (state.session.active && !state.session.paused) handleGetWordWithoutMic();
  }, [dispatch, state.session.active, state.session.paused, handleGetWordWithoutMic]);

  // Manual feedback handling for no-mic mode
  const handleManualFeedback = useCallback((isCorrect) => {
    const feedbackData = {
      user_response: state.currentWord,
      is_correct: isCorrect,
      correct_answer: state.currentWord,
      pronunciation_score: isCorrect ? 90 : 45
    };
    dispatch({
      type: 'ADD_HISTORY',
      payload: { word: state.currentWord, userResponse: state.currentWord, isCorrect, timestamp: new Date().toISOString() },
    });
    dispatch({ type: 'UPDATE_STATS', payload: { isCorrect, word: state.currentWord } });
    dispatch({ type: 'SET_FEEDBACK', payload: feedbackData });
    
    // Safely clean up URL
    if (userRecordingUrl) {
      try {
        URL.revokeObjectURL(userRecordingUrl);
        setUserRecordingUrl(null);
      } catch (error) {
        console.error('Error revoking object URL:', error);
      }
    }
    
    if (!isCorrect) dispatch({ type: 'INCREMENT_ATTEMPTS' });
    
    try {
      const feedbackAudio = new Audio(isCorrect ? '/correct.mp3' : '/incorrect.mp3');
      feedbackAudio.play()
        .catch(error => console.warn('Could not play feedback audio:', error));
      
      if (!state.session.paused && isCorrect) {
        feedbackAudio.onended = () => handleNextWord();
      }
    } catch (error) {
      console.error('Error playing feedback audio:', error);
      // If audio fails, still proceed to next word after delay
      if (!state.session.paused && isCorrect) {
        setTimeout(handleNextWord, 1500);
      }
    }
  }, [state.currentWord, state.session.paused, userRecordingUrl, dispatch, handleNextWord]);

  // Handle correct pronunciation playback
  const handlePlayCorrectPronunciation = useCallback(async () => {
    try {
      const correctAnswer = state.feedback?.correct_answer;
      if (!correctAnswer) {
        console.error('No correct answer available');
        return;
      }
      const pronunciationData = await api.getWordPronunciation(
        correctAnswer, 
        state.settings.promptLanguage === 'en' ? 'iw' : 'en'
      );
      if (pronunciationData?.audio_base64) {
        try {
          const audio = new Audio(`data:audio/wav;base64,${pronunciationData.audio_base64}`);
          audio.play()
            .catch(error => console.error('Could not play pronunciation:', error));
        } catch (error) {
          console.error('Error creating audio element:', error);
        }
      }
    } catch (error) {
      console.error('Failed to get pronunciation:', error);
    }
  }, [state.feedback, state.settings.promptLanguage]);

  // Determine if session is active for UI
  const isSessionActive = Boolean(state?.session?.active);

  return (
    <ThemeProvider>
      <SessionProvider value={sessionContextValue}>
        <AppLayout 
          state={state}
          sessionContextValue={sessionContextValue}
          togglePauseSession={togglePauseSession}
          handleEndSession={handleEndSession}
        >
          {!isSessionActive ? (
            <WelcomeScreen
              loading={state.loading}
              sessionHistory={state.sessionHistory}
              handleStartSession={handleStartSession}
              handleOpenDiagnostics={handleOpenDiagnostics}
              microphoneAvailable={microphoneAvailable}
            />
          ) : (
            <PracticeArea
              state={state}
              stream={stream}
              isRecording={isRecording}
              audioSettings={audioSettings}
              stopRecording={stopRecording}
              handleReplayTts={handleReplayTts}
              handleManualFeedback={handleManualFeedback}
              handleNextWord={handleNextWord}
              handlePlayCorrectPronunciation={handlePlayCorrectPronunciation}
              userRecordingUrl={userRecordingUrl}
            />
          )}

          <Sidebar
            state={state}
            handleUpdateSettings={handleUpdateSettings}
            handleVocabularySettings={handleVocabularySettings}
            handleChangeLanguage={handleChangeLanguage}
            audioSettings={audioSettings}
            handleUpdateAudioSettings={handleUpdateAudioSettings}
          />
        </AppLayout>

        <AnimatePresence>
          {state.microphoneError?.isOpen && (
            <div className="modal-overlay">
              {showDiagnostics ? (
                <MicrophoneDiagnostics onClose={handleCloseErrorModal} />
              ) : (
                <MicrophoneErrorModal
                  isOpen={state.microphoneError.isOpen}
                  onClose={handleCloseErrorModal}
                  errorMessage={state.microphoneError.message}
                  onContinueWithoutMic={handleContinueWithoutMic}
                  isCritical={state.microphoneError.isCritical}
                  onRunDiagnostics={() => setShowDiagnostics(true)}
                />
              )}
            </div>
          )}
        </AnimatePresence>

        <Toaster position="top-right" />
      </SessionProvider>
    </ThemeProvider>
  );
}
