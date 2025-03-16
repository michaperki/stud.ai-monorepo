// src/App.js
import React, { useReducer, useEffect, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import AudioVisualizer from './components/AudioVisualizer';
import StatusIndicator from './components/StatusIndicator';
import FeedbackDisplay from './components/FeedbackDisplay';
import HistoryDisplay from './components/HistoryDisplay';
import SettingsPanel from './components/SettingsPanel';
import SessionControls from './components/SessionControls';
import WordDisplay from './components/WordDisplay';
import useRecorder from './hooks/useRecorder';
import { useTTS } from './hooks/useTTS';
import * as api from './services/api';
import './App.css';
import { appReducer, initialState } from './reducers/appReducer';
import { SessionProvider } from './contexts/SessionContext';

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { isRecording, startRecording, stopRecording, stream } = useRecorder(handleRecordingComplete);
  const { playTTS } = useTTS();
  
  // Session refs for timer and pause state
  const sessionTimerRef = useRef(null);
  const sessionPausedRef = useRef(state.session.paused);

  // Update ref when pause state changes
  useEffect(() => {
    sessionPausedRef.current = state.session.paused;
  }, [state.session.paused]);

  // Update recording state when recorder changes
  useEffect(() => {
    if (isRecording) {
      dispatch({ type: 'SET_RECORDING_STATE', payload: 'recording' });
    }
  }, [isRecording]);

  // Session timer effect
  useEffect(() => {
    if (state.session.active && !state.session.paused) {
      sessionTimerRef.current = setInterval(() => 
        dispatch({ type: 'INCREMENT_SESSION_TIME' }), 1000);
    } else {
      clearInterval(sessionTimerRef.current);
    }
    return () => clearInterval(sessionTimerRef.current);
  }, [state.session.active, state.session.paused]);

  // Handle API errors with toast notifications
  const handleApiError = (error, message) => {
    console.error('API Error:', error);
    const errorMessage = error.response?.data?.detail || message || 'Server error';
    dispatch({ type: 'SET_ERROR', payload: errorMessage });
    toast.error(errorMessage);
  };

  // Process recording when complete
  async function handleRecordingComplete(audioBlob, word) {
    dispatch({ type: 'SET_RECORDING_STATE', payload: 'recorded' });
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      if (!word) throw new Error('No word provided to check answer');
      
      const data = await api.checkAnswer(word, audioBlob);
      
      // Add to history
      dispatch({
        type: 'ADD_HISTORY',
        payload: {
          word,
          userResponse: data.user_response,
          isCorrect: data.is_correct,
          timestamp: new Date().toISOString(),
        },
      });
      
      // Update stats
      dispatch({
        type: 'UPDATE_STATS',
        payload: {
          isCorrect: data.is_correct,
          word,
        },
      });
      
      // Handle feedback
      dispatch({ 
        type: 'SET_FEEDBACK', 
        payload: data 
      });
      
      if (!data.is_correct) {
        dispatch({ type: 'INCREMENT_ATTEMPTS' });
      }
      
      // Play feedback sound
      const soundFile = data.is_correct ? '/correct.mp3' : '/incorrect.mp3';
      const feedbackAudio = new Audio(soundFile);
      feedbackAudio.play();
      
      // Automatically proceed to next word if session is active and not paused
      feedbackAudio.onended = () => {
        if (!sessionPausedRef.current && data.is_correct) {
          handleNextWord();
        }
      };
    } catch (error) {
      handleApiError(error, 'Failed to check answer');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }

  // Fetch and play the next word
  const handleGetWord = async () => {
    if (state.session.paused) return;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const lang = state.settings.promptLanguage;
      const data = await api.fetchNextWord(lang);
      const newWord = data.word;
      
      dispatch({ type: 'SET_WORD', payload: newWord });
      dispatch({ type: 'SET_TTS_AUDIO', payload: data.audio_base64 });
      
      if (data.audio_base64) {
        const audioSrc = `data:audio/wav;base64,${data.audio_base64}`;
        playTTS(audioSrc, () => {
          if (!sessionPausedRef.current) {
            startRecording(newWord);
          }
        });
      }
    } catch (error) {
      handleApiError(error, 'Failed to fetch word');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Begin a new session
  const handleStartSession = async () => {
    dispatch({ type: 'START_SESSION' });
    await handleGetWord();
  };

  // Pause or resume the session
  const togglePauseSession = () => {
    if (state.session.paused) {
      // Resume session
      dispatch({ type: 'RESUME_SESSION' });
      
      if (state.currentWord) {
        // Replay the TTS prompt to resume the cycle
        if (state.ttsAudio) {
          handleReplayTts();
        } else {
          handleGetWord();
        }
      } else {
        handleGetWord();
      }
    } else {
      // Pause session
      dispatch({ type: 'PAUSE_SESSION' });
    }
  };

  // Replay the current word's pronunciation
  const handleReplayTts = () => {
    if (!state.ttsAudio) return;
    
    const audioSrc = `data:audio/wav;base64,${state.ttsAudio}`;
    playTTS(audioSrc, () => {
      if (!sessionPausedRef.current) {
        startRecording(state.currentWord);
      }
    });
  };

  // Move to the next word
  const handleNextWord = () => {
    dispatch({ type: 'RESET_WORD_STATE' });
    if (!state.session.paused) handleGetWord();
  };

  // Change the prompt language
  const handleChangeLanguage = (newLang) => {
    dispatch({ type: 'SET_SETTINGS', payload: { promptLanguage: newLang } });
  };

  // End the current session
  const handleEndSession = () => {
    dispatch({ type: 'END_SESSION' });
  };

  // Session context value
  const sessionContextValue = {
    state: state.session,
    stats: state.stats,
    startSession: handleStartSession,
    endSession: handleEndSession,
    togglePause: togglePauseSession,
  };

  return (
    <SessionProvider value={sessionContextValue}>
      <motion.div 
        className="app-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <header className="app-header">
          <h1 className="app-title">Hebrew Word Practice</h1>
          {state.session.active && (
            <SessionControls 
              sessionTime={state.session.time}
              isPaused={state.session.paused}
              onTogglePause={togglePauseSession}
              onEndSession={handleEndSession}
            />
          )}
        </header>

        {state.error && (
          <motion.div 
            className="error-message"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {state.error}
          </motion.div>
        )}

        <main className="app-content">
          {!state.session.active ? (
            <motion.div 
              className="welcome-screen"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <h2>Welcome to Hebrew Word Practice</h2>
              <p>Practice your Hebrew pronunciation with instant feedback.</p>
              <button
                className="button primary large"
                onClick={handleStartSession}
                disabled={state.loading}
              >
                {state.loading ? <span className="spinner"></span> : 'Start a New Session'}
              </button>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div 
                className="practice-area"
                key="practice"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <WordDisplay 
                  word={state.currentWord} 
                  ttsAudio={state.ttsAudio}
                  onReplayTts={handleReplayTts}
                  loading={state.loading}
                  sessionPaused={state.session.paused}
                  hint={state.hintText}
                />
                
                {stream && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <AudioVisualizer 
                      stream={stream} 
                      onSilenceDetected={stopRecording}
                    />
                  </motion.div>
                )}
                
                <StatusIndicator recordingState={state.recordingState} />
                
                <AnimatePresence>
                  {state.feedback && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <FeedbackDisplay 
                        feedback={state.feedback} 
                        loading={state.loading}
                        onNextWord={handleNextWord}
                        sessionPaused={state.session.paused}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          )}

          <div className="app-sidebar">
            <HistoryDisplay history={state.history} />
            <SettingsPanel
              promptLanguage={state.settings.promptLanguage}
              onChangeLanguage={handleChangeLanguage}
            />
          </div>
        </main>
      </motion.div>
      <Toaster position="top-right" />
    </SessionProvider>
  );
}
