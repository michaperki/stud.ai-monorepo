import { useRef, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import * as api from '../services/api';
import { useTTS } from './useTTS';
import { generateProgressiveHint } from '../utils/hintGenerator';

/**
 * Custom hook for managing practice session logic
 */
export const useSessionManager = ({
  state,
  dispatch,
  startRecording,
  handleMicrophoneError,
  handleApiError,
  microphoneAvailable,
  userRecordingUrl,
  setUserRecordingUrl
}) => {
  const nextWordCalledRef = useRef(false);
  const sessionTimerRef = useRef(null);
  const sessionPausedRef = useRef(state.session.paused);
  // Move hook declarations to top level to ensure they are always called
  const { playTTS } = useTTS();

  // Update session paused ref when state changes
  useEffect(() => {
    sessionPausedRef.current = state.session.paused;
  }, [state.session.paused]);
  
  // Session timer effect with cleanup
  useEffect(() => {
    // Clear any existing timer before creating a new one
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    
    if (state.session.active && !state.session.paused) {
      sessionTimerRef.current = setInterval(() => dispatch({ type: 'INCREMENT_SESSION_TIME' }), 1000);
    }
    
    // Ensure cleanup of timer on unmount or state change
    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    };
  }, [state.session.active, state.session.paused, dispatch]);
  
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
  }, [state.feedback, state.attemptCount, state.settings.promptLanguage, state.wordMetadata, dispatch]);

  // TTS replay handler
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
  }, [state.ttsAudio, state.practiceWithoutMic, state.currentWord, playTTS, startRecording, handleMicrophoneError, dispatch]);
  
  // Retry event listener effect with proper cleanup
  useEffect(() => {
    const handleRetry = () => {
      if (state.currentWord) {
        dispatch({ type: 'SET_RECORDING_STATE', payload: 'idle' });
        handleReplayTts();
      }
    };
    
    window.addEventListener('retry-pronunciation', handleRetry);
    
    // Proper cleanup on unmount
    return () => {
      window.removeEventListener('retry-pronunciation', handleRetry);
    };
  }, [state.currentWord, handleReplayTts, dispatch]);

  // Get word without microphone
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
  }, [state.session.paused, state.settings.promptLanguage, playTTS, handleApiError, dispatch]);

  // Get word with microphone
  const handleGetWord = useCallback(async () => {
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
  }, [
    state.practiceWithoutMic, 
    state.session.paused, 
    state.settings.promptLanguage,
    state.settings.wordCategory,
    state.settings.difficultyLevel,
    state.history,
    handleGetWordWithoutMic,
    playTTS,
    startRecording,
    handleMicrophoneError,
    handleApiError,
    dispatch
  ]);

  // Start session
  const handleStartSession = useCallback(async () => {
    dispatch({ type: 'START_SESSION' });
    if (microphoneAvailable === false) {
      dispatch({ type: 'SET_PRACTICE_WITHOUT_MIC', payload: true });
      await handleGetWordWithoutMic();
    } else {
      await handleGetWord();
    }
  }, [microphoneAvailable, handleGetWord, handleGetWordWithoutMic, dispatch]);

  // Toggle pause session
  const togglePauseSession = useCallback(() => {
    if (state.session.paused) {
      dispatch({ type: 'RESUME_SESSION' });
      state.currentWord
        ? (state.ttsAudio ? handleReplayTts() : state.practiceWithoutMic ? handleGetWordWithoutMic() : handleGetWord())
        : state.practiceWithoutMic ? handleGetWordWithoutMic() : handleGetWord();
    } else {
      dispatch({ type: 'PAUSE_SESSION' });
    }
  }, [
    state.session.paused, 
    state.currentWord, 
    state.ttsAudio, 
    state.practiceWithoutMic, 
    handleReplayTts, 
    handleGetWord, 
    handleGetWordWithoutMic, 
    dispatch
  ]);

  // Handle next word
  const handleNextWord = useCallback(() => {
    if (nextWordCalledRef.current) return;
    nextWordCalledRef.current = true;
    
    // Safe URL revocation
    if (userRecordingUrl) {
      try {
        URL.revokeObjectURL(userRecordingUrl);
        setUserRecordingUrl(null);
      } catch (error) {
        console.error('Error revoking object URL:', error);
      }
    }
    
    dispatch({ type: 'RESET_WORD_STATE' });
    
    // Only fetch next word if session is active and not paused
    if (state.session.active && !state.session.paused) {
      state.practiceWithoutMic ? handleGetWordWithoutMic() : handleGetWord();
    }
  }, [
    state.session.active,
    state.session.paused, 
    state.practiceWithoutMic, 
    userRecordingUrl, 
    handleGetWord, 
    handleGetWordWithoutMic, 
    setUserRecordingUrl, 
    dispatch
  ]);

  // End session with improved safety
  const handleEndSession = useCallback(() => {
    // Clean up timer first to prevent any race conditions
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    
    // Safely clean up any recording URLs
    if (userRecordingUrl) {
      try {
        URL.revokeObjectURL(userRecordingUrl);
        setUserRecordingUrl(null);
      } catch (error) {
        console.error('Error revoking object URL during session end:', error);
      }
    }
    
    // Save session data before clearing state
    try {
      const sessionData = {
        date: new Date().toISOString(),
        totalWords: state.stats.totalWords,
        incorrectAttempts: state.stats.incorrectAttempts,
        duration: state.session.time,
        wordsPerMinute: state.session.time > 60 
          ? (state.stats.totalWords / (state.session.time / 60)).toFixed(1) 
          : state.stats.totalWords,
      };
      
      // Save to local storage
      try {
        const savedSessions = JSON.parse(localStorage.getItem('sessionHistory') || '[]');
        savedSessions.push(sessionData);
        localStorage.setItem('sessionHistory', JSON.stringify(savedSessions));
      } catch (e) {
        console.error('Error saving session history:', e);
      }
      
      // Update session state
      dispatch({ type: 'END_SESSION' });
      
    } catch (error) {
      console.error('Error during session end:', error);
      // Even if there's an error, make sure we reset the session
      dispatch({ type: 'END_SESSION' });
    }
  }, [state.stats, state.session.time, dispatch, userRecordingUrl, setUserRecordingUrl]);

  // Session context value
  const sessionContextValue = {
    state: state.session,
    stats: state.stats,
    startSession: handleStartSession,
    endSession: handleEndSession,
    togglePause: togglePauseSession,
  };

  return {
    sessionContextValue,
    handleStartSession,
    handleGetWord,
    handleGetWordWithoutMic,
    handleNextWord,
    togglePauseSession,
    handleReplayTts,
    handleEndSession,
    playTTS
  };
}
