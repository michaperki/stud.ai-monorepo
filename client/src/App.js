
// src/App.js
import React, { useReducer, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import AudioVisualizer from './components/AudioVisualizer';
import StatusIndicator from './components/StatusIndicator';
import FeedbackDisplay from './components/FeedbackDisplay';
import useRecorder from './hooks/useRecorder';
import * as api from './services/api';
import './App.css';

const initialState = {
  currentWord: '',
  loading: false,
  error: null,
  recordingState: 'idle', // idle, recording, recorded
  feedback: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_WORD':
      return { ...state, currentWord: action.payload, feedback: null };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_RECORDING_STATE':
      return { ...state, recordingState: action.payload };
    case 'SET_FEEDBACK':
      return { ...state, feedback: action.payload };
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const { isRecording, startRecording, stopRecording, stream } =
    useRecorder(handleRecordingComplete);

  useEffect(() => {
    if (isRecording) {
      dispatch({ type: 'SET_RECORDING_STATE', payload: 'recording' });
    }
  }, [isRecording]);

  async function handleRecordingComplete(audioBlob) {
    dispatch({ type: 'SET_RECORDING_STATE', payload: 'recorded' });
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Submit to backend, set feedback, etc.
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      // Wait a second to show feedback
      setTimeout(() => {
        dispatch({ type: 'SET_RECORDING_STATE', payload: 'idle' });
        handleGetWord();
      }, 1000);
    }
  }

  const handleApiError = (error, message) => {
    console.error('API Error:', error);
    const errorMessage = error.response?.data?.detail || message || 'Server error';
    dispatch({ type: 'SET_ERROR', payload: errorMessage });
    toast.error(errorMessage);
  };

  const handleGetWord = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const data = await api.fetchNextWord();
      dispatch({ type: 'SET_WORD', payload: data.word });

      if (data.audio_base64) {
        const audioSrc = `data:audio/wav;base64,${data.audio_base64}`;
        const audio = new Audio(audioSrc);
        audio.play();
        audio.onended = () => startRecording();
      }
    } catch (error) {
      handleApiError(error, 'Failed to fetch word');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  return (
    <div className="container">
      <div className="title">Hebrew Word Practice</div>

      {!state.currentWord && (
        <button
          className="button primary"
          onClick={handleGetWord}
          disabled={state.loading}
        >
          {state.loading ? <span className="spinner"></span> : 'Get Word'}
        </button>
      )}

      {state.currentWord && (
        <div className="word-display">
          <h2>{state.currentWord}</h2>
        </div>
      )}

      {stream && (
        <AudioVisualizer stream={stream} onSilenceDetected={stopRecording} />
      )}

      <StatusIndicator recordingState={state.recordingState} />
      <FeedbackDisplay feedback={state.feedback} loading={state.loading} />
    </div>
  );
}

