// src/App.js
import React, { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import AudioVisualizer from './components/AudioVisualizer';
import SimpleAudioVisualizer from './components/SimpleAudioVisualizer';
import StatusIndicator from './components/StatusIndicator';
import FeedbackDisplay from './components/FeedbackDisplay';
import HistoryDisplay from './components/HistoryDisplay';
import SettingsPanel from './components/SettingsPanel';
import SessionControls from './components/SessionControls';
import WordDisplay from './components/WordDisplay';
import MicrophoneErrorModal from './components/MicrophoneErrorModal';
import MicrophoneDiagnostics from './components/MicrophoneDiagnostics';
import NoMicControls from './components/NoMicControls';
import AudioSettings from './components/AudioSettings'
import useRecorder from './hooks/useRecorder';
import { useTTS } from './hooks/useTTS';
import * as api from './services/api';
import { checkBrowserSupport, checkAudioDevices } from './utils/microphoneUtils';
import './App.css';
import { appReducer, initialState } from './reducers/appReducer';
import { SessionProvider } from './contexts/SessionContext';
import { BsMic, BsMicMute } from 'react-icons/bs';

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { playTTS } = useTTS();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  // Session refs for timer and pause state
  const sessionTimerRef = useRef(null);
  const sessionPausedRef = useRef(state.session.paused);

  // Add this function in your App component
  const handleUpdateAudioSettings = (newSettings) => {
    console.log('Updating audio settings:', newSettings);
    
    // You might want to store these in localStorage to persist them
    localStorage.setItem('audioSettings', JSON.stringify(newSettings));
    
    // If your useRecorder hook accepts setters, you could update them there
    // For now, we'll just log them and they'll be used next time
  }

  // Handle microphone errors - Define this BEFORE using it in useRecorder
  const handleMicrophoneError = useCallback((error) => {
    console.log('Microphone error detected:', error.message);
    
    // Log more details for debugging
    console.error('Detailed microphone error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      originalError: error.originalError
    });
    
    // Special handling for retry recording
    if (error.message === 'RETRY_RECORDING') {
      // Just reset the recording state without showing an error
      dispatch({ type: 'SET_RECORDING_STATE', payload: 'idle' });
      return;
    }
    
    // Check if this is a "no audio data" error which might be intermittent
    if (error.message.includes('No audio data was captured')) {
      // For "no audio data" errors, just show a toast instead of the modal
      toast.error('No audio detected. Please speak louder or check your microphone.');
      
      // Reset recording state to allow another attempt
      dispatch({ type: 'SET_RECORDING_STATE', payload: 'idle' });
      return;
    }
    
    // Determine if this is a critical error that should show the modal
    const isCriticalError = error.name === 'NotFoundError' || 
                          error.name === 'NotAllowedError' || 
                          error.message.includes('No microphone') ||
                          error.name === 'NotReadableError';
    
    if (isCriticalError) {
      // Show the modal with a helpful message
      dispatch({ 
        type: 'SET_MICROPHONE_ERROR', 
        payload: { 
          isOpen: true,
          message: error.message || 'Could not access the microphone. Please check your device and permissions.',
          isCritical: true
        } 
      });
    } else {
      // For non-critical errors, just show a toast notification
      toast.error(error.message || 'Microphone error. Please check your settings.');
    }
  }, [dispatch]);
      
  // Now use handleMicrophoneError in useRecorder after it's been defined
  const { 
    isRecording, 
    startRecording, 
    stopRecording, 
    stream, 
    microphoneAvailable, 
    retryMicrophoneAccess,
    audioSettings
  } = useRecorder(
    handleRecordingComplete, 
    handleMicrophoneError
  );

  // Function to check browser support on component mount
  useEffect(() => {
    const checkSupport = async () => {
      const browserSupport = checkBrowserSupport();
      console.log('Browser audio support:', browserSupport);
      
      if (!browserSupport.mediaDevices || !browserSupport.getUserMedia) {
        toast.error('Your browser may not fully support audio recording. Consider trying a different browser.');
      }
    };
    
    checkSupport();
  }, []);

  // Listen for retry event
  useEffect(() => {
    const handleRetry = () => {
      if (state.currentWord) {
        dispatch({ type: 'SET_RECORDING_STATE', payload: 'idle' });
        handleReplayTts();
      }
    };
    
    window.addEventListener('retry-pronunciation', handleRetry);
    return () => window.removeEventListener('retry-pronunciation', handleRetry);
  }, [state.currentWord]);
  
  // Close the microphone error modal
  const handleCloseErrorModal = useCallback(() => {
    // Try to re-access the microphone when closing the modal
    if (retryMicrophoneAccess) {
      retryMicrophoneAccess().catch(err => {
        console.warn("Retry microphone access failed:", err);
      });
    }
    
    dispatch({ 
      type: 'SET_MICROPHONE_ERROR', 
      payload: { isOpen: false } 
    });
    
    setShowDiagnostics(false);
  }, [retryMicrophoneAccess]);
  
  // Continue without using the microphone
  const handleContinueWithoutMic = useCallback(() => {
    // Enable practice without microphone mode
    dispatch({ type: 'SET_PRACTICE_WITHOUT_MIC', payload: true });
    dispatch({ type: 'SET_MICROPHONE_ERROR', payload: { isOpen: false } });
    setShowDiagnostics(false);
    
    // If we're in an active session, get the next word
    if (state.session.active && !state.session.paused) {
      handleGetWordWithoutMic();
    }
  }, [state.session.active, state.session.paused]);

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

  // Open the microphone diagnostics tool
  const handleOpenDiagnostics = useCallback(() => {
    dispatch({ 
      type: 'SET_MICROPHONE_ERROR', 
      payload: { 
        isOpen: true, 
        message: 'Test your microphone before starting a session.',
        isCritical: false
      }
    });
    
    setShowDiagnostics(true);
  }, []);

  // Function for getting words in no-microphone mode
  const handleGetWordWithoutMic = async () => {
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
        playTTS(audioSrc);
      }
      
      // In no-mic mode, we show buttons to manually indicate correct/incorrect
      dispatch({ type: 'SET_RECORDING_STATE', payload: 'no-mic-mode' });
    } catch (error) {
      handleApiError(error, 'Failed to fetch word');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Process recording when complete
  async function handleRecordingComplete(audioBlob, word) {
    if (!audioBlob || audioBlob.size === 0) {
      console.warn('Empty audio blob received - skipping processing');
      dispatch({ type: 'SET_RECORDING_STATE', payload: 'idle' });
      return;
    }
    
    dispatch({ type: 'SET_RECORDING_STATE', payload: 'recorded' });
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      if (!word) throw new Error('No word provided to check answer');

      // Use the actual API call instead of simulation
      const data = await api.checkAnswer(word, audioBlob);

      dispatch({
        type: 'ADD_HISTORY',
        payload: {
          word,
          userResponse: data.user_response,
          isCorrect: data.is_correct,
          timestamp: new Date().toISOString(),
        },
      });
      
      dispatch({
        type: 'UPDATE_STATS',
        payload: {
          isCorrect: data.is_correct,
          word,
        },
      });
      
      dispatch({ type: 'SET_FEEDBACK', payload: data });
      
      if (!data.is_correct) {
        dispatch({ type: 'INCREMENT_ATTEMPTS' });
      }
      
      const soundFile = data.is_correct ? '/correct.mp3' : '/incorrect.mp3';
      const feedbackAudio = new Audio(soundFile);
      feedbackAudio.play();
      
      if (!sessionPausedRef.current && data.is_correct) {
        feedbackAudio.onended = () => {
          handleNextWord();
        };
      }
    } catch (error) {
      handleApiError(error, 'Failed to check answer');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }

  // Function to handle manual word feedback in no-mic mode
  const handleManualFeedback = (isCorrect) => {
    // Simulate feedback similar to what the API would return
    const feedbackData = {
      user_response: state.currentWord, // In manual mode, we assume user said the word
      is_correct: isCorrect,
      correct_answer: state.currentWord,
      pronunciation_score: isCorrect ? 90 : 45 // arbitrary score
    };
    
    // Add to history
    dispatch({
      type: 'ADD_HISTORY',
      payload: {
        word: state.currentWord,
        userResponse: state.currentWord,
        isCorrect: isCorrect,
        timestamp: new Date().toISOString(),
      },
    });
    
    // Update stats
    dispatch({
      type: 'UPDATE_STATS',
      payload: {
        isCorrect: isCorrect,
        word: state.currentWord,
      },
    });
    
    // Set feedback to display results
    dispatch({ 
      type: 'SET_FEEDBACK', 
      payload: feedbackData
    });
    
    if (!isCorrect) {
      dispatch({ type: 'INCREMENT_ATTEMPTS' });
    }
    
    // Play feedback sound
    const soundFile = isCorrect ? '/correct.mp3' : '/incorrect.mp3';
    const feedbackAudio = new Audio(soundFile);
    feedbackAudio.play();
    
    // Automatically proceed to next word if session is active, not paused, and answer was correct
    if (!sessionPausedRef.current && isCorrect) {
      feedbackAudio.onended = () => {
        handleNextWord();
      };
    }
  };

  // Fetch and play the next word (with microphone mode)
  const handleGetWord = async () => {
    // If we're in practice without mic mode, use the no-mic version
    if (state.practiceWithoutMic) {
      handleGetWordWithoutMic();
      return;
    }
    
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
            try {
              startRecording(newWord).catch(error => {
                console.error("Failed to start recording:", error);
                
                // Handle microphone not found errors
                if (error.name === 'NotFoundError' || error.name === 'NotAllowedError' || error.name === 'NotReadableError') {
                  handleMicrophoneError(error);
                } else {
                  toast.error("Could not access microphone. Please check your microphone permissions.");
                }
                
                // Still update UI state even if recording fails
                dispatch({ type: 'SET_RECORDING_STATE', payload: 'idle' });
              });
            } catch (error) {
              console.error("Exception starting recording:", error);
              handleMicrophoneError(error);
            }
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
    
    // If we already know microphone isn't available, start in no-mic mode
    if (microphoneAvailable === false) {
      dispatch({ type: 'SET_PRACTICE_WITHOUT_MIC', payload: true });
      await handleGetWordWithoutMic();
    } else {
      await handleGetWord();
    }
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
          state.practiceWithoutMic ? handleGetWordWithoutMic() : handleGetWord();
        }
      } else {
        state.practiceWithoutMic ? handleGetWordWithoutMic() : handleGetWord();
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
        if (state.practiceWithoutMic) {
          // In no-mic mode, we just wait for user feedback buttons
          dispatch({ type: 'SET_RECORDING_STATE', payload: 'no-mic-mode' });
        } else {
          try {
            startRecording(state.currentWord).catch(error => {
              console.error("Failed to start recording:", error);
              
              // Maybe switch to no-mic mode automatically here if appropriate
              if (error.name === 'NotFoundError' || error.name === 'NotAllowedError' || error.name === 'NotReadableError') {
                handleMicrophoneError(error);
              } else {
                toast.error("Could not access microphone. Please check your microphone permissions.");
              }
              
              // Still update UI state even if recording fails
              dispatch({ type: 'SET_RECORDING_STATE', payload: 'idle' });
            });
          } catch (error) {
            console.error("Exception starting recording:", error);
            handleMicrophoneError(error);
          }
        }
      }
    });
  };

  // Move to the next word
  const handleNextWord = () => {
    dispatch({ type: 'RESET_WORD_STATE' });
    if (!state.session.paused) {
      state.practiceWithoutMic ? handleGetWordWithoutMic() : handleGetWord();
    }
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
              
              {/* Add microphone test button */}
              <button
                className="button secondary"
                onClick={handleOpenDiagnostics}
                style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
              >
                {microphoneAvailable === false ? <BsMicMute /> : <BsMic />}
                Test Microphone
              </button>
              
              {microphoneAvailable === false && (
                <motion.div 
                  className="mic-warning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <p>No microphone detected. You can still practice, but you'll need to manually indicate if your pronunciation was correct.</p>
                </motion.div>
              )}
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
                
                {/* Show visualizer if stream exists and not in no-mic mode */}
                {stream && !state.practiceWithoutMic && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <SimpleAudioVisualizer 
                      stream={stream}
                      onSilenceDetected={stopRecording}
                      silenceThreshold={audioSettings.silenceThreshold}
                      silenceDuration={audioSettings.silenceDuration}
                      minRecordingTime={audioSettings.minRecordingTime}
                      maxRecordingTime={audioSettings.maxRecordingTime}
                    />
                  </motion.div>
                )}
                
                {/* Show no-mic controls when in no-mic mode */}
                {state.practiceWithoutMic && state.recordingState === 'no-mic-mode' && !state.feedback && (
                  <NoMicControls
                    onCorrect={() => handleManualFeedback(true)}
                    onIncorrect={() => handleManualFeedback(false)}
                    onReplayTts={handleReplayTts}
                    loading={state.loading}
                    sessionPaused={state.session.paused}
                  />
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
              audioSettings={audioSettings}
              onUpdateAudioSettings={handleUpdateAudioSettings}
            />
          </div>
        </main>
      </motion.div>

      {/* Microphone Error Modal */}
      <AnimatePresence>
        {state.microphoneError.isOpen && (
          <div className="modal-overlay">
            {showDiagnostics ? (
              <MicrophoneDiagnostics 
                onClose={handleCloseErrorModal} 
              />
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
  );
}
