import { useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import useRecorder from './useRecorder';
import * as api from '../services/api';

/**
 * Custom hook for managing microphone interactions
 */
export const useMicrophoneManager = ({ 
  state, 
  dispatch, 
  handleApiError,
  setUserRecordingUrl 
}) => {
  // Mobile detection
  const isMobileDevice = useCallback(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
  }, []);

  // Microphone error handler
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
  }, [dispatch]);

  // Recording completion handler
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
  }, [dispatch, handleApiError, isMobileDevice, setUserRecordingUrl]);

  // Setup recorder hook
  const {
    isRecording,
    startRecording,
    stopRecording,
    stream,
    microphoneAvailable,
    retryMicrophoneAccess,
    audioSettings
  } = useRecorder(handleRecordingComplete, handleMicrophoneError);

  // Update recording state on isRecording changes
  useEffect(() => {
    if (isRecording) dispatch({ type: 'SET_RECORDING_STATE', payload: 'recording' });
  }, [isRecording, dispatch]);

  // Audio settings update handler
  const handleUpdateAudioSettings = useCallback((newSettings) => {
    localStorage.setItem('audioSettings', JSON.stringify(newSettings));
  }, []);

  return {
    microphoneAvailable,
    isRecording,
    stream,
    audioSettings,
    handleMicrophoneError,
    handleRecordingComplete,
    startRecording,
    stopRecording,
    retryMicrophoneAccess,
    handleUpdateAudioSettings
  };
};
