
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
import AudioSettings from './components/AudioSettings';
import useRecorder from './hooks/useRecorder';
import { useTTS } from './hooks/useTTS';
import * as api from './services/api';
import { checkBrowserSupport, checkAudioDevices } from './utils/microphoneUtils';
import './App.css';
import { appReducer, initialState } from './reducers/appReducer';
import { SessionProvider } from './contexts/SessionContext';
import { BsMic, BsMicMute } from 'react-icons/bs';

export default function App() {
  // Ref to guard against duplicate next word calls.
  const nextWordCalledRef = useRef(false);
  
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { playTTS } = useTTS();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  // Session refs for timer and pause state
  const sessionTimerRef = useRef(null);
  const sessionPausedRef = useRef(state.session.paused);

  const handleUpdateAudioSettings = (newSettings) => {
    console.log('Updating audio settings:', newSettings);
    localStorage.setItem('audioSettings', JSON.stringify(newSettings));
  };

  const handleMicrophoneError = useCallback((error) => {
    console.log('Microphone error detected:', error.message);
    console.error('Detailed microphone error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      originalError: error.originalError
    });
    
    if (error.message === 'RETRY_RECORDING') {
      dispatch({ type: 'SET_RECORDING_STATE', payload: 'idle' });
      return;
    }
    
    if (error.message.includes('No audio data was captured')) {
      toast.error('No audio detected. Please speak louder or check your microphone.');
      dispatch({ type: 'SET_RECORDING_STATE', payload: 'idle' });
      return;
    }
    
    const isCriticalError = error.name === 'NotFoundError' || 
                              error.name === 'NotAllowedError' || 
                              error.message.includes('No microphone') ||
                              error.name === 'NotReadableError';
    
    if (isCriticalError) {
      dispatch({ 
        type: 'SET_MICROPHONE_ERROR', 
        payload: { 
          isOpen: true,
          message: error.message || 'Could not access the microphone. Please check your device and permissions.',
          isCritical: true
        } 
      });
    } else {
      toast.error(error.message || 'Microphone error. Please check your settings.');
    }
  }, [dispatch]);
      
  const { 
    isRecording, 
    startRecording, 
    stopRecording, 
    stream, 
    microphoneAvailable, 
    retryMicrophoneAccess,
    audioSettings
  } = useRecorder(handleRecordingComplete, handleMicrophoneError);

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
  
  const handleCloseErrorModal = useCallback(() => {
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

  const handleContinueWithoutMic = useCallback(() => {
    dispatch({ type: 'SET_PRACTICE_WITHOUT_MIC', payload: true });
    dispatch({ type: 'SET_MICROPHONE_ERROR', payload: { isOpen: false } });
    setShowDiagnostics(false);
    if (state.session.active && !state.session.paused) {
      handleGetWordWithoutMic();
    }
  }, [state.session.active, state.session.paused]);

  useEffect(() => {
    sessionPausedRef.current = state.session.paused;
  }, [state.session.paused]);

  useEffect(() => {
    if (isRecording) {
      dispatch({ type: 'SET_RECORDING_STATE', payload: 'recording' });
    }
  }, [isRecording]);

  useEffect(() => {
    if (state.session.active && !state.session.paused) {
      sessionTimerRef.current = setInterval(() => 
        dispatch({ type: 'INCREMENT_SESSION_TIME' }), 1000);
    } else {
      clearInterval(sessionTimerRef.current);
    }
    return () => clearInterval(sessionTimerRef.current);
  }, [state.session.active, state.session.paused]);

  const handleApiError = (error, message) => {
    console.error('API Error:', error);
    const errorMessage = error.response?.data?.detail || message || 'Server error';
    dispatch({ type: 'SET_ERROR', payload: errorMessage });
    toast.error(errorMessage);
  };

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

  const handleGetWordWithoutMic = async () => {
    if (state.session.paused) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const lang = state.settings.promptLanguage;
      const data = await api.fetchNextWord(lang);
      const newWord = data.word;
      dispatch({ type: 'SET_WORD', payload: newWord });
      dispatch({ type: 'SET_TTS_AUDIO', payload: data.audio_base64 });
      nextWordCalledRef.current = false; // Reset the guard.
      if (data.audio_base64) {
        const audioSrc = `data:audio/wav;base64,${data.audio_base64}`;
        playTTS(audioSrc);
      }
      dispatch({ type: 'SET_RECORDING_STATE', payload: 'no-mic-mode' });
    } catch (error) {
      handleApiError(error, 'Failed to fetch word');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

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
        payload: { isCorrect: data.is_correct, word },
      });
      dispatch({ type: 'SET_FEEDBACK', payload: data });
      if (!data.is_correct) {
        dispatch({ type: 'INCREMENT_ATTEMPTS' });
      }
      const soundFile = data.is_correct ? '/correct.mp3' : '/incorrect.mp3';
      const feedbackAudio = new Audio(soundFile);
      feedbackAudio.play();
    } catch (error) {
      handleApiError(error, 'Failed to check answer');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }

  const handleManualFeedback = (isCorrect) => {
    const feedbackData = {
      user_response: state.currentWord,
      is_correct: isCorrect,
      correct_answer: state.currentWord,
      pronunciation_score: isCorrect ? 90 : 45
    };
    dispatch({
      type: 'ADD_HISTORY',
      payload: {
        word: state.currentWord,
        userResponse: state.currentWord,
        isCorrect,
        timestamp: new Date().toISOString(),
      },
    });
    dispatch({
      type: 'UPDATE_STATS',
      payload: { isCorrect, word: state.currentWord },
    });
    dispatch({ type: 'SET_FEEDBACK', payload: feedbackData });
    if (!isCorrect) {
      dispatch({ type: 'INCREMENT_ATTEMPTS' });
    }
    const soundFile = isCorrect ? '/correct.mp3' : '/incorrect.mp3';
    const feedbackAudio = new Audio(soundFile);
    feedbackAudio.play();
    if (!sessionPausedRef.current && isCorrect) {
      feedbackAudio.onended = () => {
        handleNextWord();
      };
    }
  };

  // Fetch and play the next word (with microphone mode)
  const handleGetWord = async () => {
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
      nextWordCalledRef.current = false; // Reset the guard once a new word is fetched.
      if (data.audio_base64) {
        const audioSrc = `data:audio/wav;base64,${data.audio_base64}`;
        playTTS(audioSrc, () => {
          if (!sessionPausedRef.current) {
            try {
              startRecording(newWord).catch(error => {
                console.error("Failed to start recording:", error);
                if (error.name === 'NotFoundError' || error.name === 'NotAllowedError' || error.name === 'NotReadableError') {
                  handleMicrophoneError(error);
                } else {
                  toast.error("Could not access microphone. Please check your microphone permissions.");
                }
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
    if (microphoneAvailable === false) {
      dispatch({ type: 'SET_PRACTICE_WITHOUT_MIC', payload: true });
      await handleGetWordWithoutMic();
    } else {
      await handleGetWord();
    }
  };

  const togglePauseSession = () => {
    if (state.session.paused) {
      dispatch({ type: 'RESUME_SESSION' });
      if (state.currentWord) {
        if (state.ttsAudio) {
          handleReplayTts();
        } else {
          state.practiceWithoutMic ? handleGetWordWithoutMic() : handleGetWord();
        }
      } else {
        state.practiceWithoutMic ? handleGetWordWithoutMic() : handleGetWord();
      }
    } else {
      dispatch({ type: 'PAUSE_SESSION' });
    }
  };

  const handleReplayTts = () => {
    if (!state.ttsAudio) return;
    const audioSrc = `data:audio/wav;base64,${state.ttsAudio}`;
    playTTS(audioSrc, () => {
      if (!sessionPausedRef.current) {
        if (state.practiceWithoutMic) {
          dispatch({ type: 'SET_RECORDING_STATE', payload: 'no-mic-mode' });
        } else {
          try {
            startRecording(state.currentWord).catch(error => {
              console.error("Failed to start recording:", error);
              if (error.name === 'NotFoundError' || error.name === 'NotAllowedError' || error.name === 'NotReadableError') {
                handleMicrophoneError(error);
              } else {
                toast.error("Could not access microphone. Please check your microphone permissions.");
              }
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

  // Move to the next word (guarded against duplicates)
  const handleNextWord = () => {
    if (nextWordCalledRef.current) {
      console.log("handleNextWord already called, skipping duplicate call");
      return;
    }
    nextWordCalledRef.current = true;
    dispatch({ type: 'RESET_WORD_STATE' });
    if (!state.session.paused) {
      state.practiceWithoutMic ? handleGetWordWithoutMic() : handleGetWord();
    }
  };

  const handleChangeLanguage = (newLang) => {
    dispatch({ type: 'SET_SETTINGS', payload: { promptLanguage: newLang } });
  };

  const handleEndSession = () => {
    dispatch({ type: 'END_SESSION' });
  };

  const sessionContextValue = {
    state: state.session,
    stats: state.stats,
    startSession: handleStartSession,
    endSession: handleEndSession,
    togglePause: togglePauseSession,
  };

  const handlePlayCorrectPronunciation = async () => {
    try {
      const correctAnswer = state.feedback?.correct_answer;
      if (!correctAnswer) {
        toast.error('No correct answer available');
        return;
      }
      const promptLanguage = state.settings.promptLanguage;
      const pronunciationLanguage = promptLanguage === 'en' ? 'iw' : 'en';
      const pronunciationData = await api.getWordPronunciation(correctAnswer, pronunciationLanguage);
      if (pronunciationData && pronunciationData.audio_base64) {
        const audioSrc = `data:audio/wav;base64,${pronunciationData.audio_base64}`;
        const audio = new Audio(audioSrc);
        audio.play().catch(error => {
          console.error('Error playing pronunciation:', error);
          toast.error('Could not play pronunciation');
        });
      } else {
        toast.error('No pronunciation available');
      }
    } catch (error) {
      console.error('Error fetching pronunciation:', error);
      toast.error('Failed to get pronunciation');
    }
  };

  const handleUpdateSettings = (newSettings) => {
    dispatch({ type: 'SET_SETTINGS', payload: newSettings });
    const currentSettings = { ...state.settings, ...newSettings };
    localStorage.setItem('appSettings', JSON.stringify(currentSettings));
  };

  useEffect(() => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        dispatch({ type: 'SET_SETTINGS', payload: parsedSettings });
      } catch (e) {
        console.error('Failed to parse saved settings:', e);
      }
    }
  }, []);

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
                        onPlayCorrectPronunciation={handlePlayCorrectPronunciation}
                        autoAdvanceDelay={state.settings.autoAdvanceDelay}
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
              autoAdvanceDelay={state.settings.autoAdvanceDelay}
              onUpdateSettings={handleUpdateSettings}
            />
          </div>
        </main>
      </motion.div>

      <AnimatePresence>
        {state.microphoneError.isOpen && (
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
  );
}

