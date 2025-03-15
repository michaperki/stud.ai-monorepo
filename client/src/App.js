
// src/App.js
import React, { useReducer, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import AudioVisualizer from './components/AudioVisualizer';
import StatusIndicator from './components/StatusIndicator';
import FeedbackDisplay from './components/FeedbackDisplay';
import HistoryDisplay from './components/HistoryDisplay'; // <-- new
import useRecorder from './hooks/useRecorder';
import * as api from './services/api';
import './App.css';

const initialState = {
  currentWord: '',
  ttsAudio: null,     // Store base64 TTS so we can replay
  loading: false,
  error: null,
  recordingState: 'idle', // idle, recording, recorded
  feedback: null,
  history: [],
  attemptCount: 0,
  lastWord: '',       // Track the last word to know if user repeated the same word
};

// A simple helper to create partial hints. For "book", after 2 fails we show "b__k".
function getHintForWord(englishWord, attemptCount) {
  // For demonstration, only start hinting if attemptCount >= 2
  if (attemptCount < 2) return null;
  // Build a partial reveal: first and last letter shown, underscores in between
  if (englishWord.length <= 2) return null;
  const first = englishWord[0];
  const last = englishWord[englishWord.length - 1];
  const middle = '_'.repeat(englishWord.length - 2);
  return `Hint: ${first}${middle}${last}`;
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_WORD': {
      return {
        ...state,
        currentWord: action.payload,
        feedback: null,
        // If it's a new word, reset attemptCount
        attemptCount: state.lastWord === action.payload ? state.attemptCount : 0,
        lastWord: action.payload,
      };
    }
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
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Note the new signature: handleRecordingComplete(blob, word)
  const { isRecording, startRecording, stopRecording, stream } =
    useRecorder(handleRecordingComplete);

  useEffect(() => {
    if (isRecording) {
      dispatch({ type: 'SET_RECORDING_STATE', payload: 'recording' });
    }
  }, [isRecording]);

  async function handleRecordingComplete(audioBlob, word) {
    dispatch({ type: 'SET_RECORDING_STATE', payload: 'recorded' });
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      if (!word) {
        throw new Error('No word provided to checkAnswer');
      }
      const data = await api.checkAnswer(word, audioBlob);
      // data = { user_response, is_correct }

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

      if (data.is_correct) {
        // If correct, reset attempts to 0
        dispatch({ type: 'SET_FEEDBACK', payload: data });
        dispatch({ type: 'SET_WORD', payload: state.currentWord }); // Keep same word but resets attemptCount
      } else {
        // If incorrect, increment attemptCount
        dispatch({ type: 'INCREMENT_ATTEMPTS' });
        // Show the feedback with user’s response + “Try again”
        dispatch({ type: 'SET_FEEDBACK', payload: data });
      }
    } catch (error) {
      handleApiError(error, 'Failed to check answer');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
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
      const newWord = data.word;
      dispatch({ type: 'SET_WORD', payload: newWord });
      dispatch({ type: 'SET_TTS_AUDIO', payload: data.audio_base64 });

      if (data.audio_base64) {
        const audioSrc = `data:audio/wav;base64,${data.audio_base64}`;
        const audio = new Audio(audioSrc);
        audio.play();
        audio.onended = () => {
          // Pass the chosen word directly into startRecording
          startRecording(newWord);
        };
      }
    } catch (error) {
      handleApiError(error, 'Failed to fetch word');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Let user replay TTS prompt
  const handleReplayTts = () => {
    if (!state.ttsAudio) return;
    const audioSrc = `data:audio/wav;base64,${state.ttsAudio}`;
    const audio = new Audio(audioSrc);
    audio.play();
  };

  // If user is correct or wants to move on, fetch next word
  const handleNextWord = () => {
    dispatch({ type: 'SET_FEEDBACK', payload: null });
    dispatch({ type: 'SET_RECORDING_STATE', payload: 'idle' });
    handleGetWord();
  };

  const currentHint = getHintForWord(
    state.feedback?.correct_answer ?? '', // If you have the correct_answer in feedback
    state.attemptCount
  );

  return (
    <div className="container">
      <div className="title">Hebrew Word Practice</div>

      {/* Error display if needed */}
      {state.error && (
        <div className="error-message">
          {state.error}
        </div>
      )}

      {/* Show button to get new word if none is displayed */}
      {!state.currentWord && (
        <button
          className="button primary"
          onClick={handleGetWord}
          disabled={state.loading}
        >
          {state.loading ? <span className="spinner"></span> : 'Get Word'}
        </button>
      )}

      {/* Display the current Hebrew word */}
      {state.currentWord && (
        <div className="word-display">
          <h2>{state.currentWord}</h2>
        </div>
      )}

      {/* Replay TTS if we have audio */}
      {state.ttsAudio && (
        <button
          className="button secondary"
          onClick={handleReplayTts}
          disabled={state.loading}
        >
          Replay
        </button>
      )}

      {/* Visualizer (stream) */}
      {stream && (
        <AudioVisualizer stream={stream} onSilenceDetected={stopRecording} />
      )}

      <StatusIndicator recordingState={state.recordingState} />

      {/* Show any hints if attempts > 1 */}
      {currentHint && (
        <div style={{ marginTop: '1rem', color: '#666' }}>
          {currentHint}
        </div>
      )}

      {/* Feedback + "Next Word" button */}
      <FeedbackDisplay
        feedback={state.feedback}
        loading={state.loading}
        onNextWord={handleNextWord}
      />

      {/* Display history table */}
      <HistoryDisplay history={state.history} />
    </div>
  );
}

