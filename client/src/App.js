
import React, { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
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
import VocabularySettings from './components/VocabularySettings';
import useRecorder from './hooks/useRecorder';
import { useTTS } from './hooks/useTTS';
import * as api from './services/api';
import { checkBrowserSupport } from './utils/microphoneUtils';
import './App.css';
import { appReducer, initialState } from './reducers/appReducer';
import { SessionProvider } from './contexts/SessionContext';

// New component imports
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeToggle from './components/ThemeToggle';
import EnhancedSessionStats from './components/EnhancedSessionStats';
import EnhancedHintDisplay from './components/EnhancedHintDisplay';
import LearningProgressChart from './components/LearningProgressChart';
import { generateProgressiveHint } from './utils/hintGenerator';
import { BsMic, BsMicMute } from 'react-icons/bs';

const isMobileDevice = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
};

export default function App() {
  const nextWordCalledRef = useRef(false);
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { playTTS } = useTTS();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [userRecordingUrl, setUserRecordingUrl] = useState(null);

  // New state for session history (progress chart)
  const [sessionHistory, setSessionHistory] = useState([]);

  const sessionTimerRef = useRef(null);
  const sessionPausedRef = useRef(state.session.paused);

  const handleUpdateAudioSettings = useCallback((newSettings) => {
    localStorage.setItem('audioSettings', JSON.stringify(newSettings));
  }, []);

  const handleApiError = useCallback((error, message) => {
    const errorMessage = error.response?.data?.detail || message || 'Server error';
    dispatch({ type: 'SET_ERROR', payload: errorMessage });
    toast.error(errorMessage);
  }, []);

  const handleMicrophoneError = useCallback((error) => {
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
  }, []);

  const handleRecordingComplete = useCallback(async (audioBlob, word) => {
    if (!audioBlob || audioBlob.size === 0) {
      dispatch({ type: 'SET_RECORDING_STATE', payload: 'idle' });
      return;
    }
    dispatch({ type: 'SET_RECORDING_STATE', payload: 'recorded' });
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      let url;
      if (isMobileDevice()) {
        const fileName = `recording-${Date.now()}.${audioBlob.type.includes('webm') ? 'webm' : 'mp3'}`;
        const file = new File([audioBlob], fileName, { type: audioBlob.type });
        url = /iPhone|iPad|iPod/i.test(navigator.userAgent)
          ? URL.createObjectURL(audioBlob)
          : URL.createObjectURL(file);
      } else {
        url = URL.createObjectURL(audioBlob);
      }
      setUserRecordingUrl(url);
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
      dispatch({ type: 'UPDATE_STATS', payload: { isCorrect: data.is_correct, word } });
      dispatch({ type: 'SET_FEEDBACK', payload: data });
      if (!data.is_correct) {
        dispatch({ type: 'INCREMENT_ATTEMPTS' });
      }
      new Audio(data.is_correct ? '/correct.mp3' : '/incorrect.mp3').play();
    } catch (error) {
      handleApiError(error, 'Failed to check answer');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [handleApiError]);

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
      if (!browserSupport.mediaDevices || !browserSupport.getUserMedia) {
        toast.error('Your browser may not fully support audio recording.');
      }
    };
    checkSupport();
  }, []);

  const handleReplayTts = useCallback(() => {
    if (!state.ttsAudio) return;
    const audioSrc = `data:audio/wav;base64,${state.ttsAudio}`;
    playTTS(audioSrc, () => {
      if (!sessionPausedRef.current) {
        if (state.practiceWithoutMic) {
          dispatch({ type: 'SET_RECORDING_STATE', payload: 'no-mic-mode' });
        } else {
          startRecording(state.currentWord).catch(error => {
            if (error.name === 'NotFoundError' || error.name === 'NotAllowedError' || error.name === 'NotReadableError') {
              handleMicrophoneError(error);
            } else {
              toast.error("Could not access microphone.");
            }
            dispatch({ type: 'SET_RECORDING_STATE', payload: 'idle' });
          });
        }
      }
    });
  }, [state.ttsAudio, state.practiceWithoutMic, state.currentWord, playTTS, startRecording, handleMicrophoneError]);

  const handleOpenDiagnostics = useCallback(() => {
    dispatch({ 
      type: 'SET_MICROPHONE_ERROR', 
      payload: { isOpen: true, message: 'Test your microphone before starting a session.', isCritical: false }
    });
    setShowDiagnostics(true);
  }, []);

  const handleGetWordWithoutMic = useCallback(async () => {
    if (state.session.paused) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const data = await api.fetchNextWord(state.settings.promptLanguage);
      dispatch({ type: 'SET_WORD', payload: data.word });
      dispatch({ type: 'SET_TTS_AUDIO', payload: data.audio_base64 });
      nextWordCalledRef.current = false;
      if (data.audio_base64) playTTS(`data:audio/wav;base64,${data.audio_base64}`);
      dispatch({ type: 'SET_RECORDING_STATE', payload: 'no-mic-mode' });
    } catch (error) {
      handleApiError(error, 'Failed to fetch word');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.session.paused, state.settings.promptLanguage, playTTS, handleApiError]);

  const handleContinueWithoutMic = useCallback(() => {
    dispatch({ type: 'SET_PRACTICE_WITHOUT_MIC', payload: true });
    dispatch({ type: 'SET_MICROPHONE_ERROR', payload: { isOpen: false } });
    setShowDiagnostics(false);
    if (state.session.active && !state.session.paused) handleGetWordWithoutMic();
  }, [state.session.active, state.session.paused, handleGetWordWithoutMic]);

  useEffect(() => {
    sessionPausedRef.current = state.session.paused;
  }, [state.session.paused]);

  useEffect(() => {
    if (isRecording) dispatch({ type: 'SET_RECORDING_STATE', payload: 'recording' });
  }, [isRecording]);

  useEffect(() => {
    if (state.session.active && !state.session.paused) {
      sessionTimerRef.current = setInterval(() => dispatch({ type: 'INCREMENT_SESSION_TIME' }), 1000);
    } else {
      clearInterval(sessionTimerRef.current);
    }
    return () => clearInterval(sessionTimerRef.current);
  }, [state.session.active, state.session.paused]);

  useEffect(() => {
    const handleRetry = () => {
      if (state.currentWord) {
        dispatch({ type: 'SET_RECORDING_STATE', payload: 'idle' });
        handleReplayTts();
      }
    };
    window.addEventListener('retry-pronunciation', handleRetry);
    return () => window.removeEventListener('retry-pronunciation', handleRetry);
  }, [state.currentWord, handleReplayTts]);

  const handleCloseErrorModal = useCallback(() => {
    if (retryMicrophoneAccess) {
      retryMicrophoneAccess().catch(err => console.warn("Retry microphone access failed:", err));
    }
    dispatch({ type: 'SET_MICROPHONE_ERROR', payload: { isOpen: false } });
    setShowDiagnostics(false);
  }, [retryMicrophoneAccess]);

  function handleManualFeedback(isCorrect) {
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
    setUserRecordingUrl(null);
    if (!isCorrect) dispatch({ type: 'INCREMENT_ATTEMPTS' });
    const feedbackAudio = new Audio(isCorrect ? '/correct.mp3' : '/incorrect.mp3');
    feedbackAudio.play();
    if (!sessionPausedRef.current && isCorrect) {
      feedbackAudio.onended = () => handleNextWord();
    }
  }

  const handleGetWord = async () => {
    if (state.practiceWithoutMic) {
      handleGetWordWithoutMic();
      return;
    }
    if (state.session.paused) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const options = {
        category: state.settings.wordCategory || undefined,
        difficulty: state.settings.difficultyLevel || undefined,
        exclude: state.history.length > 0 ? state.history.slice(0, 5).map(item => item.word) : undefined
      };
      const data = await api.fetchNextWordEnhanced(state.settings.promptLanguage, options);
      dispatch({ type: 'SET_WORD', payload: data.word });
      dispatch({ type: 'SET_TTS_AUDIO', payload: data.audio_base64 });
      if (data.metadata) dispatch({ type: 'SET_WORD_METADATA', payload: data.metadata });
      nextWordCalledRef.current = false;
      if (data.audio_base64) {
        playTTS(`data:audio/wav;base64,${data.audio_base64}`, () => {
          if (!sessionPausedRef.current) {
            startRecording(data.word).catch(error => {
              if (error.name === 'NotFoundError' || error.name === 'NotAllowedError' || error.name === 'NotReadableError') {
                handleMicrophoneError(error);
              } else {
                toast.error("Could not access microphone.");
              }
              dispatch({ type: 'SET_RECORDING_STATE', payload: 'idle' });
            });
          }
        });
      }
    } catch (error) {
      handleApiError(error, 'Failed to fetch word');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

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
      state.currentWord
        ? (state.ttsAudio ? handleReplayTts() : state.practiceWithoutMic ? handleGetWordWithoutMic() : handleGetWord())
        : state.practiceWithoutMic ? handleGetWordWithoutMic() : handleGetWord();
    } else {
      dispatch({ type: 'PAUSE_SESSION' });
    }
  };

  const handleNextWord = () => {
    if (nextWordCalledRef.current) return;
    nextWordCalledRef.current = true;
    if (userRecordingUrl) {
      URL.revokeObjectURL(userRecordingUrl);
      setUserRecordingUrl(null);
    }
    dispatch({ type: 'RESET_WORD_STATE' });
    if (!state.session.paused) state.practiceWithoutMic ? handleGetWordWithoutMic() : handleGetWord();
  };

  const handleChangeLanguage = (newLang) => {
    dispatch({ type: 'SET_SETTINGS', payload: { promptLanguage: newLang } });
  };

  // Updated handleEndSession with session history tracking
  const handleEndSession = () => {
    dispatch({ type: 'END_SESSION' });
    const sessionData = {
      date: new Date().toISOString(),
      totalWords: state.stats.totalWords,
      incorrectAttempts: state.stats.incorrectAttempts,
      duration: state.session.time,
      wordsPerMinute: state.session.time > 60 
        ? (state.stats.totalWords / (state.session.time / 60)).toFixed(1) 
        : state.stats.totalWords,
    };
    setSessionHistory(prev => [...prev, sessionData]);
    try {
      const savedSessions = JSON.parse(localStorage.getItem('sessionHistory') || '[]');
      savedSessions.push(sessionData);
      localStorage.setItem('sessionHistory', JSON.stringify(savedSessions));
    } catch (e) {
      console.error('Error saving session history:', e);
    }
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
      const pronunciationData = await api.getWordPronunciation(correctAnswer, state.settings.promptLanguage === 'en' ? 'iw' : 'en');
      if (pronunciationData?.audio_base64) {
        new Audio(`data:audio/wav;base64,${pronunciationData.audio_base64}`).play().catch(error => {
          toast.error('Could not play pronunciation');
        });
      } else {
        toast.error('No pronunciation available');
      }
    } catch (error) {
      toast.error('Failed to get pronunciation');
    }
  };

  const handleUpdateSettings = (newSettings) => {
    dispatch({ type: 'SET_SETTINGS', payload: newSettings });
    localStorage.setItem('appSettings', JSON.stringify({ ...state.settings, ...newSettings }));
  };

  const handleVocabularySettings = (vocabSettings) => {
    dispatch({ type: 'SET_SETTINGS', payload: { wordCategory: vocabSettings.wordCategory, difficultyLevel: vocabSettings.difficultyLevel } });
    localStorage.setItem('appSettings', JSON.stringify({ ...state.settings, ...vocabSettings }));
  };

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

  // Enhanced hint generation effect
  useEffect(() => {
    if (state.feedback && !state.feedback.is_correct) {
      const hintObject = generateProgressiveHint(
        state.feedback.correct_answer,
        state.attemptCount,
        {
          isHebrew: state.settings.promptLanguage === 'iw',
          categoryHint: state.wordMetadata?.category,
          pronunciationGuide: state.wordMetadata?.pronunciation_guide
        }
      );
      if (hintObject) {
        dispatch({ type: 'SET_ENHANCED_HINT', payload: hintObject });
      }
    }
  }, [state.feedback, state.attemptCount, state.settings.promptLanguage, state.wordMetadata]);

  return (
    <ThemeProvider>
      <SessionProvider value={sessionContextValue}>
        <motion.div className="app-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <header className="app-header">
            <h1 className="app-title">Hebrew Word Practice</h1>
            <div className="app-controls">
              {state.session.active && (
                <SessionControls
                  sessionTime={state.session.time}
                  isPaused={state.session.paused}
                  onTogglePause={togglePauseSession}
                  onEndSession={handleEndSession}
                />
              )}
              <ThemeToggle />
            </div>
          </header>

          {state.error && (
            <motion.div className="error-message" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              {state.error}
            </motion.div>
          )}

          <main className="app-content">
            {!state.session.active ? (
              <motion.div className="welcome-screen" initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
                <h2>Welcome to Hebrew Word Practice</h2>
                <p>Practice your Hebrew pronunciation with instant feedback.</p>
                <button className="button primary large" onClick={handleStartSession} disabled={state.loading}>
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
                  <motion.div className="mic-warning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                    <p>No microphone detected. You can still practice, but you'll need to manually indicate if your pronunciation was correct.</p>
                  </motion.div>
                )}
                {/* Learning progress visualization */}
                {sessionHistory.length > 0 && (
                  <div className="progress-section">
                    <h3>Your Learning Progress</h3>
                    <LearningProgressChart sessionData={sessionHistory} />
                  </div>
                )}
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div className="practice-area" key="practice" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                  <WordDisplay
                    word={state.currentWord}
                    ttsAudio={state.ttsAudio}
                    onReplayTts={handleReplayTts}
                    loading={state.loading}
                    sessionPaused={state.session.paused}
                    hint={state.hintText}
                    metadata={state.wordMetadata}
                    onPlayCorrectPronunciation={handlePlayCorrectPronunciation}
                  />

                  {stream && !state.practiceWithoutMic && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
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
                    <NoMicControls onCorrect={() => handleManualFeedback(true)} onIncorrect={() => handleManualFeedback(false)} onReplayTts={handleReplayTts} loading={state.loading} sessionPaused={state.session.paused} />
                  )}

                  <StatusIndicator recordingState={state.recordingState} />

                  <AnimatePresence>
                    {state.feedback && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                        <FeedbackDisplay
                          feedback={state.feedback}
                          loading={state.loading}
                          onNextWord={handleNextWord}
                          sessionPaused={state.session.paused}
                          onPlayCorrectPronunciation={handlePlayCorrectPronunciation}
                          autoAdvanceDelay={state.settings.autoAdvanceDelay}
                          userRecordingUrl={userRecordingUrl}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {/* Enhanced hint display */}
                  {state.enhancedHint && <EnhancedHintDisplay hint={state.enhancedHint} />}
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
              <VocabularySettings
                onUpdateSettings={handleVocabularySettings}
                currentSettings={{ wordCategory: state.settings.wordCategory, difficultyLevel: state.settings.difficultyLevel }}
              />
              {state.session.active && <EnhancedSessionStats session={state.session} stats={state.stats} history={state.history} />}
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
    </ThemeProvider>
  );
}

