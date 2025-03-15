
import { useReducer, useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import './App.css';

const API_BASE = 'http://localhost:8000/api';

const initialState = {
  currentWord: '',
  userResponse: '',
  feedback: '',
  loading: false,
  error: null,
  recordingState: 'idle', // idle, recording, recorded
  audioBlob: null,
  audioUrl: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_WORD':
      return {
        ...state,
        currentWord: action.payload,
        feedback: '',
        userResponse: '',
        recordingState: 'idle',
        audioBlob: null,
        audioUrl: null,
      };
    case 'SET_USER_RESPONSE':
      return { ...state, userResponse: action.payload };
    case 'SET_FEEDBACK':
      return { ...state, feedback: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_RECORDING_STATE':
      return { ...state, recordingState: action.payload };
    case 'SET_AUDIO':
      return {
        ...state,
        audioBlob: action.payload.blob || state.audioBlob,
        audioUrl: action.payload.url || state.audioUrl
      };
    case 'RESET_RECORDING':
      return {
        ...state,
        recordingState: 'idle',
        audioBlob: null,
        audioUrl: null
      };
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  useEffect(() => {
    if (state.recordingState === 'recording') {
      const interval = setInterval(() => {
        setRecordingTimer(prev => prev + 1);
      }, 1000);
      setTimerInterval(interval);
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      setRecordingTimer(0);
    }
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [state.recordingState]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const fetchNextWord = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await axios.get(`${API_BASE}/next_word`);
      dispatch({ type: 'SET_WORD', payload: response.data.word });
      
      if (response.data.audio_base64) {
        const audioSrc = `data:audio/wav;base64,${response.data.audio_base64}`;
        const audio = new Audio(audioSrc);
        audio.play();
      }
    } catch (error) {
      handleApiError(error, 'Failed to fetch word');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleApiError = (error, message) => {
    console.error('API Error:', error);
    dispatch({ type: 'SET_ERROR', payload: message || 'Server error' });
    toast.error(message || 'Server error');
  };

  // ------- FIX #1: Request a valid WebM/Opus format -------
  const startRecording = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Specify the MIME type so we get a proper WebM opus container
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        const audioUrl = URL.createObjectURL(audioBlob);

        dispatch({
          type: 'SET_AUDIO',
          payload: { blob: audioBlob, url: audioUrl },
        });

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      dispatch({ type: 'SET_RECORDING_STATE', payload: 'recording' });
      toast.success('Recording started');
    } catch (error) {
      console.error('Recording error:', error);
      toast.error('Could not start recording. Check microphone permissions.');
      dispatch({ type: 'SET_ERROR', payload: 'Microphone access denied' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      toast.error('No active recording found');
      return;
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      mediaRecorderRef.current.stop();
      dispatch({ type: 'SET_RECORDING_STATE', payload: 'recorded' });
      toast.success('Recording stopped');
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast.error('Failed to stop recording');
      dispatch({ type: 'SET_ERROR', payload: 'Failed to stop recording' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const cancelRecording = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
    dispatch({ type: 'RESET_RECORDING' });
    toast.info('Recording cancelled');
  };

  // ------- FIX #2: Upload as .webm instead of .wav -------
  const submitRecording = async () => {
    if (!state.audioBlob || !state.currentWord) {
      toast.error('No recording available or no word selected');
      return;
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const formData = new FormData();
      formData.append('file', state.audioBlob, 'recording.webm');
      
      const response = await axios.post(
        `${API_BASE}/check_answer/${state.currentWord}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      dispatch({ type: 'SET_USER_RESPONSE', payload: response.data.user_response });
      dispatch({ type: 'SET_FEEDBACK', payload: response.data.feedback_text });

      if (response.data.audio_base64) {
        const audioSrc = `data:audio/wav;base64,${response.data.audio_base64}`;
        const audio = new Audio(audioSrc);
        audio.play();
      }
    } catch (error) {
      handleApiError(error, 'Failed to check answer');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="container">
      <div className="title">Hebrew Word Practice</div>

      {state.error && <div className="error-box">{state.error}</div>}

      {state.currentWord ? (
        <div className="word-box">{state.currentWord}</div>
      ) : (
        <button
          className="button primary"
          onClick={fetchNextWord}
          disabled={state.loading}
        >
          {state.loading ? <span className="spinner"></span> : 'Get Word'}
        </button>
      )}

      {state.currentWord && (
        <div className="recording-controls">
          {state.recordingState === 'idle' && (
            <button
              className="button primary"
              onClick={startRecording}
              disabled={state.loading}
            >
              Start Recording
            </button>
          )}
          {state.recordingState === 'recording' && (
            <div className="recording-indicator">
              <div className="recording-pulse"></div>
              <div className="timer">{formatTime(recordingTimer)}</div>
              <div className="recording-text">Recording...</div>
              <div className="recorded-controls">
                <button
                  className="button danger"
                  onClick={stopRecording}
                  disabled={state.loading}
                >
                  Stop Recording
                </button>
                <button
                  className="button secondary"
                  onClick={cancelRecording}
                  disabled={state.loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {state.recordingState === 'recorded' && (
            <div className="recorded-controls">
              <audio src={state.audioUrl} controls />
              <div>
                <button
                  className="button success"
                  onClick={submitRecording}
                  disabled={state.loading}
                >
                  Submit
                </button>
                <button
                  className="button secondary"
                  onClick={cancelRecording}
                  disabled={state.loading}
                >
                  Cancel
                </button>
                <button
                  className="button primary"
                  onClick={startRecording}
                  disabled={state.loading}
                >
                  Record Again
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {state.userResponse && (
        <div className="response-box">Your answer: {state.userResponse}</div>
      )}
      {state.feedback && <div className="feedback-box">{state.feedback}</div>}

      {state.currentWord && (
        <button
          className="button warning"
          onClick={fetchNextWord}
          disabled={state.loading}
        >
          Next Word
        </button>
      )}
    </div>
  );
}

