
// src/App.js
import React, { useReducer, useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import AudioVisualizer from './components/AudioVisualizer';
import StatusIndicator from './components/StatusIndicator';
import FeedbackDisplay from './components/FeedbackDisplay';
import HistoryDisplay from './components/HistoryDisplay';
import SettingsPanel from './components/SettingsPanel';
import useRecorder from './hooks/useRecorder';
import * as api from './services/api';
import './App.css';

const initialState = {
  currentWord: '',
  ttsAudio: null,
  loading: false,
  error: null,
  recordingState: 'idle', // idle, recording, recorded
  feedback: null,
  history: [],
  attemptCount: 0,
  lastWord: '',
  settings: {
    promptLanguage: 'en', // Hebrew (iw) by default, can also be 'en'
  },
};

function getHintForWord(englishWord, attemptCount) {
  if (attemptCount < 2) return null;
  if (!englishWord || englishWord.length <= 2) return null;
  const first = englishWord[0];
  const last = englishWord[englishWord.length - 1];
  const middle = '_'.repeat(englishWord.length - 2);
  return `Hint: ${first}${middle}${last}`;
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_WORD':
      return {
        ...state,
        currentWord: action.payload,
        feedback: null,
        attemptCount:
          state.lastWord === action.payload ? state.attemptCount : 0,
        lastWord: action.payload,
      };
    case 'SET_TTS_AUDIO':
      return { ...state, ttsAudio: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_RECORDING_STATE':
      return { ...state, recordingState: action.payload };
    case 'SET_FEEDBACK':
      return { ...state, feedback: action.payload };
    case 'ADD_HISTORY':
      return { ...state, history: [...state.history, action.payload] };
    case 'INCREMENT_ATTEMPTS':
      return { ...state, attemptCount: state.attemptCount + 1 };
    case 'SET_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
        },
      };
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);
  const sessionPausedRef = useRef(sessionPaused);

  useEffect(() => {
    sessionPausedRef.current = sessionPaused;
  }, [sessionPaused]);

  const { isRecording, startRecording, stopRecording, stream } =
    useRecorder(handleRecordingComplete);

  useEffect(() => {
    if (isRecording) {
      dispatch({ type: 'SET_RECORDING_STATE', payload: 'recording' });
    }
  }, [isRecording]);

  useEffect(() => {
    if (sessionActive && !sessionPaused) {
      timerRef.current = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [sessionActive, sessionPaused]);

  async function handleRecordingComplete(audioBlob, word) {
    dispatch({ type: 'SET_RECORDING_STATE', payload: 'recorded' });
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      if (!word) throw new Error('No word provided to checkAnswer');
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
      if (data.is_correct) {
        dispatch({ type: 'SET_FEEDBACK', payload: data });
        dispatch({ type: 'SET_WORD', payload: state.currentWord });
      } else {
        dispatch({ type: 'INCREMENT_ATTEMPTS' });
        dispatch({ type: 'SET_FEEDBACK', payload: data });
      }
      const soundFile = data.is_correct ? '/correct.mp3' : '/incorrect.mp3';
      const feedbackAudio = new Audio(soundFile);
      feedbackAudio.play();
      feedbackAudio.onended = () => {
        if (!sessionPausedRef.current) {
          handleNextWord();
        }
      };
    } catch (error) {
      handleApiError(error, 'Failed to check answer');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }

  const handleApiError = (error, message) => {
    console.error('API Error:', error);
    const errorMessage =
      error.response?.data?.detail || message || 'Server error';
    dispatch({ type: 'SET_ERROR', payload: errorMessage });
    toast.error(errorMessage);
  };

  const handleGetWord = async () => {
    if (sessionPaused) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const lang = state.settings.promptLanguage;
      const data = await api.fetchNextWord(lang);
      const newWord = data.word;
      dispatch({ type: 'SET_WORD', payload: newWord });
      dispatch({ type: 'SET_TTS_AUDIO', payload: data.audio_base64 });
      if (data.audio_base64) {
        const audioSrc = `data:audio/wav;base64,${data.audio_base64}`;
        const audio = new Audio(audioSrc);
        audio.play();
        audio.onended = () => {
          if (!sessionPausedRef.current) {
            startRecording(newWord);
          }
        };
      }
    } catch (error) {
      handleApiError(error, 'Failed to fetch word');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleStartSession = async () => {
    setSessionActive(true);
    setSessionPaused(false);
    setElapsedTime(0);
    await handleGetWord();
  };

  const togglePauseSession = () => {
    if (sessionPaused) {
      // Resume session
      setSessionPaused(false);
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
      setSessionPaused(true);
    }
  };

  const handleReplayTts = () => {
    if (!state.ttsAudio) return;
    const audioSrc = `data:audio/wav;base64,${state.ttsAudio}`;
    const audio = new Audio(audioSrc);
    audio.play();
    audio.onended = () => {
      if (!sessionPausedRef.current) {
        startRecording(state.currentWord);
      }
    };
  };

  const handleNextWord = () => {
    dispatch({ type: 'SET_FEEDBACK', payload: null });
    dispatch({ type: 'SET_RECORDING_STATE', payload: 'idle' });
    if (!sessionPaused) handleGetWord();
  };

  const currentHint = getHintForWord(
    state.feedback?.correct_answer ?? '',
    state.attemptCount
  );

  const handleChangeLanguage = (newLang) => {
    dispatch({ type: 'SET_SETTINGS', payload: { promptLanguage: newLang } });
  };

  return (
    <div className="container">
      <div className="title">Hebrew Word Practice</div>
      {state.error && <div className="error-message">{state.error}</div>}

      {!sessionActive ? (
        <button
          className="button primary"
          onClick={handleStartSession}
          disabled={state.loading}
        >
          {state.loading ? <span className="spinner"></span> : 'Start Session'}
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div>Session Time: {elapsedTime}s</div>
          <button className="button secondary" onClick={togglePauseSession}>
            {sessionPaused ? 'Resume Session' : 'Pause Session'}
          </button>
        </div>
      )}

      {state.currentWord && (
        <div className="word-display">
          <h2>{state.currentWord}</h2>
        </div>
      )}

      {state.ttsAudio && (
        <button
          className="button secondary"
          onClick={handleReplayTts}
          disabled={state.loading || sessionPaused}
        >
          Replay
        </button>
      )}

      {stream && (
        <AudioVisualizer stream={stream} onSilenceDetected={stopRecording} />
      )}

      <StatusIndicator recordingState={state.recordingState} />

      {currentHint && (
        <div style={{ marginTop: '1rem', color: '#666' }}>{currentHint}</div>
      )}

      <FeedbackDisplay feedback={state.feedback} loading={state.loading} />

      <HistoryDisplay history={state.history} />

      <SettingsPanel
        promptLanguage={state.settings.promptLanguage}
        onChangeLanguage={handleChangeLanguage}
      />
    </div>
  );
}

