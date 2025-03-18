// src/hooks/useTTS.js
import { useRef, useCallback, useEffect } from 'react';

export function useTTS() {
  const audioRef = useRef(null);
  
  // Cleanup function to handle component unmounting
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.onended = null;
          audioRef.current = null;
        } catch (error) {
          console.error('Error cleaning up audio element:', error);
        }
      }
    };
  }, []);
  
  const playTTS = useCallback((audioSrc, onEnded) => {
    // Validate input
    if (!audioSrc) {
      console.warn('Invalid audio source provided to playTTS');
      return null;
    }
    
    // Clean up previous audio if it exists
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.onended = null;
      } catch (error) {
        console.error('Error cleaning up previous audio:', error);
      }
    }
    
    try {
      // Create and configure new audio element
      const audio = new Audio(audioSrc);
      audioRef.current = audio;
      
      if (onEnded && typeof onEnded === 'function') {
        audio.onended = onEnded;
      }
      
      // Start playing
      const playPromise = audio.play();
      
      // Handle promise rejection properly (required for Chrome)
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Error playing TTS audio:', error);
          // Clean up on failure
          audioRef.current = null;
        });
      }
      
      return audio;
    } catch (error) {
      console.error('Error creating audio element:', error);
      return null;
    }
  }, []);
  
  const stopTTS = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.onended = null;
      } catch (error) {
        console.error('Error stopping TTS:', error);
      }
    }
  }, []);
  
  return {
    playTTS,
    stopTTS,
    isPlaying: !!audioRef.current && !audioRef.current.paused
  };
}
