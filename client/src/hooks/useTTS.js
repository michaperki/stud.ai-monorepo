// src/hooks/useTTS.js
import { useRef, useCallback } from 'react';

export function useTTS() {
  const audioRef = useRef(null);
  
  const playTTS = useCallback((audioSrc, onEnded) => {
    // Clean up previous audio if it exists
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
    }
    
    // Create and configure new audio element
    const audio = new Audio(audioSrc);
    audioRef.current = audio;
    
    if (onEnded) {
      audio.onended = onEnded;
    }
    
    // Start playing
    audio.play().catch(error => {
      console.error('Error playing TTS audio:', error);
    });
    
    return audio;
  }, []);
  
  const stopTTS = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
    }
  }, []);
  
  return {
    playTTS,
    stopTTS,
    isPlaying: !!audioRef.current && !audioRef.current.paused
  };
}
