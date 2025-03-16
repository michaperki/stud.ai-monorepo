// src/hooks/useRecorder.js
import { useRef, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

const useRecorder = (onRecordingComplete) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const currentWordRef = useRef(null);

  // Start recording audio
  const startRecording = useCallback(async (word) => {
    try {
      // Reset state
      setError(null);
      audioChunksRef.current = [];
      currentWordRef.current = word;
      
      // Request microphone access
      const audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      setStream(audioStream);
      
      // Create and configure MediaRecorder
      const mediaRecorder = new MediaRecorder(audioStream, { 
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Handle data available event
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop event
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { 
          type: 'audio/webm;codecs=opus' 
        });
        
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setIsRecording(false);

        // Pass recording data to callback
        if (onRecordingComplete) {
          onRecordingComplete(blob, currentWordRef.current);
        }

        // Clean up stream
        if (audioStream) {
          audioStream.getTracks().forEach(track => track.stop());
        }
        setStream(null);
      };

      // Handle recording error
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setError('Recording error: ' + event.error.message);
        toast.error('Recording error. Please try again.');
        
        if (audioStream) {
          audioStream.getTracks().forEach(track => track.stop());
        }
        setStream(null);
        setIsRecording(false);
      };

      // Start recording with 10-second safety timeout
      mediaRecorder.start();
      setIsRecording(true);
      
      // Safety timeout (stop after 10 seconds if something goes wrong)
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          console.log('Safety timeout reached - stopping recording');
          stopRecording();
        }
      }, 10000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Could not access microphone: ' + error.message);
      toast.error('Microphone access denied or not available');
      throw error;
    }
  }, [onRecordingComplete]);

  // Stop recording audio
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.error('Error stopping recording:', error);
        
        // Clean up anyway
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
        setIsRecording(false);
      }
    }
  }, [stream]);

  // Cancel recording and discard data
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        audioChunksRef.current = [];
        
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        
        setAudioBlob(null);
        setAudioUrl(null);
        setStream(null);
        setIsRecording(false);
      } catch (error) {
        console.error('Error canceling recording:', error);
      }
    }
  }, [stream]);

  return {
    isRecording,
    audioBlob,
    audioUrl,
    stream,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
};

export default useRecorder;
