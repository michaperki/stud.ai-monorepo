
// src/hooks/useRecorder.js
import { useRef, useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import * as api from '../services/api';

// Helper functions added near the top
const forceFileExtension = (blob, extension) => {
  const fileExtension = extension.startsWith('.') ? extension : `.${extension}`;
  const newType = `audio/${extension}`;
  return new Blob([blob], { type: newType });
};

const isIOSDevice = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

// MIME type detection function
const getBestMimeType = () => {
  const mimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/wav',
    ''
  ];
  for (const type of mimeTypes) {
    if (type === '' || MediaRecorder.isTypeSupported(type)) {
      console.log(`Using MIME type: ${type || 'default browser codec'}`);
      return type;
    }
  }
  console.log('No tested MIME types supported, using browser default');
  return '';
};

const useRecorder = (onRecordingComplete, onMicrophoneError) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [microphoneAvailable, setMicrophoneAvailable] = useState(null);
  const [audioSettings, setAudioSettings] = useState({
    silenceThreshold: 15,
    silenceDuration: 1000,
    minRecordingTime: 500,
    maxRecordingTime: 8000
  });
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const currentWordRef = useRef(null);
  const recordingTimerRef = useRef(null);
  
  useEffect(() => {
    const fetchAudioSettings = async () => {
      try {
        const settings = await api.getAudioSettings();
        if (settings) {
          console.log('Loaded audio settings from server:', settings);
          setAudioSettings({
            silenceThreshold: settings.silence_threshold || 15,
            silenceDuration: settings.silence_duration || 1000,
            minRecordingTime: settings.min_recording_time || 500,
            maxRecordingTime: settings.max_recording_time || 8000
          });
        }
      } catch (error) {
        console.warn('Could not fetch audio settings, using defaults:', error);
      }
    };
    fetchAudioSettings();
  }, []);
  
  const cleanupMediaResources = useCallback(() => {
    console.log('Cleaning up media resources');
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('Stopping existing recorder');
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('Error stopping existing recorder:', e);
      }
      mediaRecorderRef.current = null;
    }
    if (stream) {
      console.log('Stopping existing stream tracks');
      stream.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind, track.label);
        track.stop();
      });
      setStream(null);
    }
  }, [stream]);
  
  const stopRecording = useCallback(() => {
    console.log('stopRecording called');
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    const stopWithDelay = (delay = 0) => {
      if (delay > 0) {
        setTimeout(() => {
          performStop();
        }, delay);
      } else {
        performStop();
      }
    };
    const performStop = () => {
      if (mediaRecorderRef.current) {
        try {
          if (mediaRecorderRef.current.state === 'recording') {
            console.log('Stopping MediaRecorder');
            mediaRecorderRef.current.stop();
          } else if (mediaRecorderRef.current.state === 'paused') {
            console.log('Resuming and then stopping MediaRecorder');
            mediaRecorderRef.current.resume();
            setTimeout(() => {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
              }
            }, 100);
          } else {
            console.log('MediaRecorder already inactive, just cleaning up');
            cleanupMediaResources();
            setIsRecording(false);
          }
        } catch (error) {
          console.error('Error stopping recording:', error);
          cleanupMediaResources();
          setIsRecording(false);
        }
      } else {
        console.log('MediaRecorder not available, nothing to stop');
        setIsRecording(false);
      }
    };
    const timeSinceRecordingStarted = isRecording ? Date.now() - (mediaRecorderRef.current?._startTime || 0) : Infinity;
    if (timeSinceRecordingStarted < 500) {
      stopWithDelay(500 - timeSinceRecordingStarted);
    } else {
      stopWithDelay(0);
    }
  }, [cleanupMediaResources, isRecording]);
  
  useEffect(() => {
    if (microphoneAvailable !== null) return;
    const checkMicrophoneAccess = async () => {
      try {
        console.log('Checking microphone availability...');
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error('getUserMedia not supported in this browser');
          setMicrophoneAvailable(false);
          setError('Your browser does not support microphone access. Please try a different browser.');
          if (onMicrophoneError) {
            onMicrophoneError(new Error('getUserMedia not supported in this browser'));
          }
          return;
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasAudioDevice = devices.some(device => device.kind === 'audioinput');
        if (!hasAudioDevice) {
          console.error('No audio input devices detected');
          setMicrophoneAvailable(false);
          setError('No microphone detected on your device.');
          if (onMicrophoneError) {
            onMicrophoneError(new Error('No microphone detected on your device.'));
          }
          return;
        }
        try {
          console.log('Testing microphone access permission...');
          const tempStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: { ideal: true },
              noiseSuppression: { ideal: true },
              autoGainControl: { ideal: true }
            } 
          });
          console.log('Microphone access granted during initial check');
          tempStream.getTracks().forEach(track => {
            console.log('Stopping track from permission test');
            track.stop();
          });
          setMicrophoneAvailable(true);
        } catch (permissionError) {
          console.warn('Microphone permission test failed:', permissionError);
          if (permissionError.name === 'NotAllowedError' || permissionError.name === 'PermissionDeniedError') {
            setError('Microphone access denied. Please allow microphone access in your browser settings.');
            console.error('Permission denied by user or system');
          } else if (permissionError.name === 'NotFoundError' || permissionError.name === 'DevicesNotFoundError') {
            setError('No microphone found, or it might be in use by another application.');
            console.error('Device not found even though we detected audio devices');
          } else if (permissionError.name === 'NotReadableError' || permissionError.name === 'TrackStartError') {
            setError('Cannot access your microphone. It might be in use by another application.');
            console.error('Hardware/OS level blocking of microphone access');
          } else {
            setError(`Microphone error: ${permissionError.name}. Please check your microphone settings.`);
            console.error('Unknown microphone error', permissionError);
          }
          setMicrophoneAvailable(false);
          if (onMicrophoneError) {
            onMicrophoneError(permissionError);
          }
        }
      } catch (error) {
        console.error('Unexpected error checking microphone availability:', error);
        setMicrophoneAvailable(false);
        setError('Could not check microphone availability due to an unexpected error.');
        if (onMicrophoneError) {
          onMicrophoneError(error);
        }
      }
    };
    checkMicrophoneAccess();
  }, [microphoneAvailable, onMicrophoneError]);
  
  const startRecording = useCallback(async (word) => {
    try {
      console.log('StartRecording called for word:', word);
      if (microphoneAvailable === false) {
        const error = new Error('No microphone available. Please connect a microphone and refresh the page.');
        console.error(error.message);
        if (onMicrophoneError) {
          onMicrophoneError(error);
        }
        throw error;
      }
      setError(null);
      audioChunksRef.current = [];
      currentWordRef.current = word;
      cleanupMediaResources();
      console.log('Requesting microphone access...');
      let audioStream;
      try {
        console.log('Trying with advanced audio constraints...');
        audioStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: { ideal: 48000 },
            channelCount: { ideal: 1 }
          } 
        });
        console.log('Microphone access granted with advanced constraints');
      } catch (advancedError) {
        console.warn('Failed with advanced constraints, trying basic constraints:', advancedError);
        try {
          audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log('Microphone access granted with basic constraints');
        } catch (basicError) {
          console.error('Failed to get stream with basic constraints:', basicError);
          setMicrophoneAvailable(false);
          let errorMessage = 'Could not access microphone';
          if (basicError.name === 'NotAllowedError' || basicError.name === 'PermissionDeniedError') {
            errorMessage = 'Microphone access was denied. Please allow microphone access in your browser settings.';
          } else if (basicError.name === 'NotFoundError' || basicError.name === 'DevicesNotFoundError') {
            errorMessage = 'No microphone found. Please connect a microphone and try again.';
          } else if (basicError.name === 'NotReadableError' || basicError.name === 'TrackStartError') {
            errorMessage = 'Your microphone is in use by another application. Please close other apps that might be using it.';
          } else if (basicError.name === 'OverconstrainedError') {
            errorMessage = 'Microphone constraints cannot be satisfied. Please try with a different microphone.';
          } else if (basicError.name === 'AbortError') {
            errorMessage = 'Microphone access was aborted. Please try again.';
          } else if (basicError.name === 'SecurityError') {
            errorMessage = 'Microphone access is blocked due to security restrictions in your browser.';
          } else if (basicError.name === 'TypeError') {
            errorMessage = 'Invalid audio constraints provided. This is an application error.';
          }
          setError(`${errorMessage} (${basicError.name})`);
          if (onMicrophoneError) {
            const error = new Error(errorMessage);
            error.originalError = basicError;
            onMicrophoneError(error);
          }
          throw basicError;
        }
      }
      setStream(audioStream);
      setMicrophoneAvailable(true);
      console.log('Creating MediaRecorder...');
      let mediaRecorder;
      try {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
          console.log('iOS device detected, using basic MediaRecorder settings');
          mediaRecorder = new MediaRecorder(audioStream);
          console.log('iOS MediaRecorder created with MIME type:', mediaRecorder.mimeType);
        } else {
          const bestMimeType = getBestMimeType();
          if (bestMimeType) {
            console.log(`Using ${bestMimeType} for recording`);
            mediaRecorder = new MediaRecorder(audioStream, { 
              mimeType: bestMimeType,
              audioBitsPerSecond: 128000
            });
          } else {
            console.log('Using default MediaRecorder');
            mediaRecorder = new MediaRecorder(audioStream);
          }
          console.log('MediaRecorder created with MIME type:', mediaRecorder.mimeType);
        }
      } catch (recorderError) {
        console.error('Failed to create MediaRecorder with specific settings, using default:', recorderError);
        mediaRecorder = new MediaRecorder(audioStream);
      }
      mediaRecorderRef.current = mediaRecorder;
      console.log('Current audio settings:', audioSettings);
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available from recorder, size:', event.data.size);
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Modified onstop handler with file extension fix
      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped, creating audio blob');
        console.log('Chunks collected:', audioChunksRef.current.length);
        if (recordingTimerRef.current) {
          clearTimeout(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        let totalSize = 0;
        audioChunksRef.current.forEach(chunk => {
          totalSize += chunk.size;
        });
        if (totalSize < 1000) {
          console.warn('Insufficient audio data recorded, total size:', totalSize);
          toast.error('No audio was captured. Please try again and make sure you speak audibly.');
          setTimeout(() => {
            cleanupMediaResources();
            setIsRecording(false);
            if (onMicrophoneError) {
              onMicrophoneError(new Error('RETRY_RECORDING'));
            }
          }, 1000);
          return;
        }
        let blobType = mediaRecorderRef.current ? mediaRecorderRef.current.mimeType : '';
        if (!blobType || blobType === '') {
          if (isIOSDevice()) {
            blobType = 'audio/mp4';
          } else {
            blobType = 'audio/webm';
          }
        }
        console.log('Creating blob with MIME type:', blobType);
        let blob = new Blob(audioChunksRef.current, { type: blobType });
        if (isIOSDevice()) {
          console.log('iOS device detected, using m4a extension for compatibility');
          blob = forceFileExtension(blob, 'm4a');
        } else if (blobType.includes('webm')) {
          blob = forceFileExtension(blob, 'webm');
        }
        console.log('Final blob created, size:', blob.size, 'type:', blob.type);
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setIsRecording(false);
        if (onRecordingComplete) {
          onRecordingComplete(blob, currentWordRef.current);
        }
        cleanupMediaResources();
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setError('Recording error: ' + (event.error.message || 'Unknown error'));
        toast.error('Recording error. Please try again.');
        cleanupMediaResources();
        setIsRecording(false);
      };
      
      const startRecorderWithDelay = () => {
        console.log('Starting MediaRecorder with delay');
        if (!mediaRecorderRef.current) {
          console.warn('MediaRecorder was already cleaned up before start');
          return;
        }
        try {
          if (mediaRecorderRef.current.state === 'inactive') {
            mediaRecorderRef.current._startTime = Date.now();
            mediaRecorderRef.current.start(100);
            console.log('MediaRecorder started successfully');
            setIsRecording(true);
            recordingTimerRef.current = setTimeout(() => {
              console.log(`Maximum recording time (${audioSettings.maxRecordingTime}ms) reached - stopping recording`);
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                stopRecording();
              }
            }, audioSettings.maxRecordingTime);
          } else {
            console.error('Cannot start MediaRecorder - not in inactive state');
            cleanupMediaResources();
            if (onMicrophoneError) {
              onMicrophoneError(new Error('MediaRecorder in invalid state before starting'));
            }
          }
        } catch (startError) {
          console.error('Error starting MediaRecorder:', startError);
          toast.error('Error starting recording. Please try again.');
          cleanupMediaResources();
          if (onMicrophoneError) {
            onMicrophoneError(startError);
          }
        }
      };
      
      setTimeout(startRecorderWithDelay, 800);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      cleanupMediaResources();
      setIsRecording(false);
      throw error;
    }
  }, [onRecordingComplete, onMicrophoneError, microphoneAvailable, cleanupMediaResources, stopRecording, audioSettings]);
  
  const cancelRecording = useCallback(() => {
    console.log('cancelRecording called');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        audioChunksRef.current = [];
        cleanupMediaResources();
        setAudioBlob(null);
        setAudioUrl(null);
        setIsRecording(false);
      } catch (error) {
        console.error('Error canceling recording:', error);
        cleanupMediaResources();
        setIsRecording(false);
      }
    }
  }, [cleanupMediaResources]);
  
  const retryMicrophoneAccess = useCallback(async () => {
    console.log('Retrying microphone access...');
    setMicrophoneAvailable(null);
    try {
      cleanupMediaResources();
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted on retry');
      tempStream.getTracks().forEach(track => {
        console.log('Stopping track from permission test');
        track.stop();
      });
      setMicrophoneAvailable(true);
      setError(null);
      return true;
    } catch (error) {
      console.error('Retry microphone access failed:', error);
      setMicrophoneAvailable(false);
      let errorMessage = 'Could not access microphone';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please allow microphone access in your browser.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found or available.';
      } else {
        errorMessage = `Microphone error: ${error.message}`;
      }
      setError(errorMessage);
      if (onMicrophoneError) {
        onMicrophoneError(error);
      }
      throw error;
    }
  }, [cleanupMediaResources, onMicrophoneError]);
  
  useEffect(() => {
    return () => {
      console.log('useRecorder hook unmounting, cleaning up resources');
      cleanupMediaResources();
    };
  }, [cleanupMediaResources]);
  
  const [isRecordingCooldown, setIsRecordingCooldown] = useState(false);
  
  useEffect(() => {
    if (!isRecording && isRecordingCooldown) {
      const cooldownTimer = setTimeout(() => {
        setIsRecordingCooldown(false);
      }, 1000);
      return () => clearTimeout(cooldownTimer);
    }
    if (isRecording && !isRecordingCooldown) {
      setIsRecordingCooldown(true);
    }
  }, [isRecording, isRecordingCooldown]);
  
  return {
    isRecording,
    audioBlob,
    audioUrl,
    stream,
    error,
    microphoneAvailable,
    audioSettings,
    startRecording,
    stopRecording,
    cancelRecording,
    retryMicrophoneAccess
  };
};

export default useRecorder;

