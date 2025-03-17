// src/hooks/useRecorder.js
import { useRef, useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import * as api from '../services/api';

const useRecorder = (onRecordingComplete, onMicrophoneError) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [microphoneAvailable, setMicrophoneAvailable] = useState(null); // null = unknown, true = available, false = unavailable
  const [audioSettings, setAudioSettings] = useState({
    silenceThreshold: 15,     // Default values, will be overridden when fetched from server
    silenceDuration: 1000,    
    minRecordingTime: 500,   
    maxRecordingTime: 8000   
  });
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const currentWordRef = useRef(null);
  const recordingTimerRef = useRef(null);
  
  // Fetch audio settings from server on mount
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
  
  // Function to clean up existing stream and recorder
  const cleanupMediaResources = useCallback(() => {
    console.log('Cleaning up media resources');
    
    // Clear any recording timers
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    // Stop any existing recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('Stopping existing recorder');
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('Error stopping existing recorder:', e);
      }
      mediaRecorderRef.current = null;
    }
    
    // Stop any existing stream tracks
    if (stream) {
      console.log('Stopping existing stream tracks');
      stream.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind, track.label);
        track.stop();
      });
      setStream(null);
    }
  }, [stream]);
  
  // Stop recording audio - define this before startRecording
  const stopRecording = useCallback(() => {
    console.log('stopRecording called');
    
    // Clear any recording timers
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    // Make sure we wait a small bit before stopping if we just started
    // This helps prevent "Invalid state" errors when stopping too quickly after starting
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
            // Small delay to ensure resume completes before stopping
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
          
          // Clean up anyway
          cleanupMediaResources();
          setIsRecording(false);
        }
      } else {
        console.log('MediaRecorder not available, nothing to stop');
        setIsRecording(false);
      }
    };
    
    // Check if we just started recording - if so add a small delay before stopping
    // This prevents "Invalid state" errors when stopping too quickly after starting
    const timeSinceRecordingStarted = isRecording ? Date.now() - (mediaRecorderRef.current?._startTime || 0) : Infinity;
    if (timeSinceRecordingStarted < 500) { // If less than 500ms since start
      stopWithDelay(500 - timeSinceRecordingStarted);
    } else {
      stopWithDelay(0);
    }
  }, [cleanupMediaResources, isRecording]);
  
  // Test microphone availability on component mount
  useEffect(() => {
    // Only check once
    if (microphoneAvailable !== null) return;
    
    const checkMicrophoneAccess = async () => {
      try {
        console.log('Checking microphone availability...');
        
        // First check if the browser supports getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error('getUserMedia not supported in this browser');
          setMicrophoneAvailable(false);
          setError('Your browser does not support microphone access. Please try a different browser.');
          if (onMicrophoneError) {
            onMicrophoneError(new Error('getUserMedia not supported in this browser'));
          }
          return;
        }
        
        // Then check if audio devices exist at all
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
        
        // We have a microphone, now attempt to get permission
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
          
          // Stop all tracks right away - we're just testing access
          tempStream.getTracks().forEach(track => {
            console.log('Stopping track from permission test');
            track.stop();
          });
          
          setMicrophoneAvailable(true);
        } catch (permissionError) {
          console.warn('Microphone permission test failed:', permissionError);
          
          // Special handling for each kind of permission error
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

  // Start recording audio
  const startRecording = useCallback(async (word) => {
    try {
      console.log('StartRecording called for word:', word);
      
      // If we already know the microphone isn't available, fail fast
      if (microphoneAvailable === false) {
        const error = new Error('No microphone available. Please connect a microphone and refresh the page.');
        console.error(error.message);
        
        // Notify the app about the error
        if (onMicrophoneError) {
          onMicrophoneError(error);
        }
        
        throw error;
      }
      
      // Reset state
      setError(null);
      audioChunksRef.current = [];
      currentWordRef.current = word;
      
      // First, clean up any existing media resources
      cleanupMediaResources();
      
      console.log('Requesting microphone access...');
      
      // Try with advanced audio constraints first, then fall back if needed
      let audioStream;
      
      try {
        console.log('Trying with advanced audio constraints...');
        audioStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            // Try to ensure we get a good quality recording
            sampleRate: { ideal: 48000 },
            channelCount: { ideal: 1 }  // Mono is often better for speech
          } 
        });
        console.log('Microphone access granted with advanced constraints');
      } catch (advancedError) {
        console.warn('Failed with advanced constraints, trying basic constraints:', advancedError);
        
        try {
          // Fallback to basic audio constraints
          audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: true 
          });
          console.log('Microphone access granted with basic constraints');
        } catch (basicError) {
          console.error('Failed to get stream with basic constraints:', basicError);
          setMicrophoneAvailable(false);
          
          // Provide detailed error messages based on the error type
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
          
          // Notify the app about the error
          if (onMicrophoneError) {
            const error = new Error(errorMessage);
            error.originalError = basicError;
            onMicrophoneError(error);
          }
          
          throw basicError;
        }
      }
      
      // If we got here, we have a stream
      setStream(audioStream);
      setMicrophoneAvailable(true);
      
      console.log('Creating MediaRecorder...');
      
      // Detect the best supported MIME type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4;codecs=mp4a.40.2'
      ];
      
      const supportedType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
      
      // Create and configure MediaRecorder
      let mediaRecorder;
      try {
        if (supportedType) {
          console.log(`Using ${supportedType} for recording`);
          mediaRecorder = new MediaRecorder(audioStream, { 
            mimeType: supportedType,
            audioBitsPerSecond: 128000  // Set a reasonable bitrate
          });
        } else {
          console.log('Using default MediaRecorder');
          mediaRecorder = new MediaRecorder(audioStream);
        }
        console.log('MediaRecorder created with MIME type:', mediaRecorder.mimeType);
      } catch (recorderError) {
        console.error('Failed to create MediaRecorder with specific settings, using default:', recorderError);
        mediaRecorder = new MediaRecorder(audioStream);
      }
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Log current audio settings
      console.log('Current audio settings:', audioSettings);
      
      // Handle data available event
      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available from recorder, size:', event.data.size);
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop event
      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped, creating audio blob');
        console.log('Chunks collected:', audioChunksRef.current.length);
        
        // Clear any remaining timers
        if (recordingTimerRef.current) {
          clearTimeout(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        
        // Add a minimum threshold for chunk size
        let totalSize = 0;
        audioChunksRef.current.forEach(chunk => {
          totalSize += chunk.size;
        });
        
        if (totalSize < 1000) { // Less than 1KB is likely no real audio data
          console.warn('Insufficient audio data recorded, total size:', totalSize);
          
          toast.error('No audio was captured. Please try again and make sure you speak audibly.');
          
          // Wait a bit before allowing retry
          setTimeout(() => {
            // Reset state for retry
            cleanupMediaResources();
            setIsRecording(false);
            // Set state back to idle
            if (onMicrophoneError) {
              // Use onMicrophoneError as a hook to reset UI state
              onMicrophoneError(new Error('RETRY_RECORDING'));
            }
          }, 1000);
          
          return;
        }
        
        // Create audio blob
        const blobType = supportedType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: blobType });
        
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setIsRecording(false);
        
        // Pass recording data to callback
        if (onRecordingComplete) {
          onRecordingComplete(blob, currentWordRef.current);
        }
        
        // Clean up stream
        cleanupMediaResources();
      };
      
      // Handle recording error
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setError('Recording error: ' + (event.error.message || 'Unknown error'));
        toast.error('Recording error. Please try again.');
        
        cleanupMediaResources();
        setIsRecording(false);
      };
      
      // Add a delay before recording starts
      // Give the user time to prepare after hearing the word and ensure MediaRecorder is ready
      const startRecorderWithDelay = () => {
        console.log('Starting MediaRecorder with delay');
        
        // Adding a safety check in case the recorder was cleaned up during the delay
        if (!mediaRecorderRef.current) {
          console.warn('MediaRecorder was already cleaned up before start');
          return;
        }
        
        try {
          // Double-check to prevent "Failed to execute 'start' on 'MediaRecorder'" errors
          if (mediaRecorderRef.current.state === 'inactive') {
            mediaRecorderRef.current._startTime = Date.now(); // Track when we started
            mediaRecorderRef.current.start(100); // Collect data every 100ms
            console.log('MediaRecorder started successfully');
            setIsRecording(true);
            
            // Schedule the recording to stop after the max recording time
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
      
      // Add a slightly longer delay to ensure the previous MediaRecorder is fully cleaned up
      setTimeout(startRecorderWithDelay, 800); // Increase delay to 800ms
      
    } catch (error) {
      console.error('Error starting recording:', error);
      
      // Be extra cautious about cleaning up resources in case of error
      cleanupMediaResources();
      setIsRecording(false);
      
      // We already set appropriate error messages above, 
      // so we just need to throw the error here
      throw error;
    }
  }, [onRecordingComplete, onMicrophoneError, microphoneAvailable, cleanupMediaResources, stopRecording, audioSettings]);

  // Cancel recording and discard data
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
        
        // Clean up anyway
        cleanupMediaResources();
        setIsRecording(false);
      }
    }
  }, [cleanupMediaResources]);

  // Retry microphone access (for when permission may have changed)
  const retryMicrophoneAccess = useCallback(async () => {
    console.log('Retrying microphone access...');
    setMicrophoneAvailable(null);
    
    try {
      // Clean up existing resources first
      cleanupMediaResources();
      
      // Try to get permission
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted on retry');
      
      // Stop all tracks right away - we're just testing access
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

  // Clean up on unmount
  useEffect(() => {
    return () => {
      console.log('useRecorder hook unmounting, cleaning up resources');
      cleanupMediaResources();
    };
  }, [cleanupMediaResources]);
  
  // Add additional safety - ensure we have a cooldown period between recordings
  const [isRecordingCooldown, setIsRecordingCooldown] = useState(false);
  
  useEffect(() => {
    if (!isRecording && isRecordingCooldown) {
      // Add a cooldown period after stopping recording before allowing a new recording
      const cooldownTimer = setTimeout(() => {
        setIsRecordingCooldown(false);
      }, 1000); // 1 second cooldown
      
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
