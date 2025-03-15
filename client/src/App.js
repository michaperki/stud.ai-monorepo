
import { useReducer, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import './App.css'; // Import CSS for styling

const API_BASE = 'http://localhost:8000/api';

// Reducer for managing state
const initialState = {
  currentWord: '',
  userResponse: '',
  feedback: '',
  loading: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_WORD':
      return { ...state, currentWord: action.payload, feedback: '', userResponse: '' };
    case 'SET_USER_RESPONSE':
      return { ...state, userResponse: action.payload };
    case 'SET_FEEDBACK':
      return { ...state, feedback: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

// API helper functions
const fetchNextWord = async (dispatch) => {
  dispatch({ type: 'SET_LOADING', payload: true });
  try {
    const res = await axios.get(`${API_BASE}/next_word`);
    dispatch({ type: 'SET_WORD', payload: res.data.word });
    playAudio(res.data.audio_base64);
  } catch (error) {
    toast.error('Failed to fetch the word.');
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false });
  }
};

const submitAnswer = async (dispatch, word) => {
  dispatch({ type: 'SET_LOADING', payload: true });
  try {
    const res = await axios.post(`${API_BASE}/check_answer/${word}`);
    dispatch({ type: 'SET_USER_RESPONSE', payload: res.data.user_response });
    dispatch({ type: 'SET_FEEDBACK', payload: res.data.feedback_text });
    playAudio(res.data.audio_base64);
  } catch (error) {
    toast.error('Error processing response.');
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false });
  }
};

// Function to play audio from base64
const playAudio = (base64) => {
  const audio = new Audio(`data:audio/mp3;base64,${base64}`);
  audio.play();
};

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <div className="container">
      <h1 className="title">Personal Vocab Trainer</h1>

      <button
        className="button primary"
        onClick={() => fetchNextWord(dispatch)}
        disabled={state.loading}
      >
        {state.loading ? <span className="spinner"></span> : 'Next Word'}
      </button>

      {state.currentWord && (
        <div className="word-box">
          <strong>Word:</strong> {state.currentWord}
        </div>
      )}

      {state.currentWord && !state.feedback && (
        <button
          className="button success"
          onClick={() => submitAnswer(dispatch, state.currentWord)}
          disabled={state.loading}
        >
          {state.loading ? 'Listening...' : 'Answer'}
        </button>
      )}

      {state.userResponse && (
        <div className="response-box">
          <strong>You said:</strong> {state.userResponse}
        </div>
      )}

      {state.feedback && (
        <div className="feedback-box">
          <strong>Feedback:</strong> {state.feedback}
        </div>
      )}
    </div>
  );
}

