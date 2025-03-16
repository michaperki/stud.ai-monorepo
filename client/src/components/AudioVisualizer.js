// src/components/AudioVisualizer.js
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const AudioVisualizer = ({ stream, onSilenceDetected }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const silenceStartRef = useRef(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  
  // Configurable parameters with more forgiving values
  const silenceThreshold = 5; // Lower threshold to be more sensitive (original was 20)
  const silenceDuration = 2000; // Longer time to confirm silence (2 sec instead of 1.5)
  const initialDelay = 3000; // Longer delay before silence detection starts (3 sec instead of 1)
  const forceCaptureTime = 1500; // Ensure we capture at least this much audio before allowing silence detection
  
  useEffect(() => {
    if (!stream || !canvasRef.current) return;
    
    let isListeningForSilence = false;
    let recordingStartTime = Date.now();
    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);
    
    source.connect(analyser);
    analyser.fftSize = 1024;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Enable silence detection after initial delay
    setTimeout(() => {
      recordingStartTime = Date.now();
      isListeningForSilence = true;
      console.log('Silence detection activated after initial delay');
    }, initialDelay);
    
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      
      // Clear canvas with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(1, '#16213e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avgVolume = sum / bufferLength / 255.0;
      setVolumeLevel(avgVolume * 100);
      
      // Draw frequency bars
      const barWidth = (canvasWidth / bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvasHeight * 0.8;
        
        // Bar color based on frequency and volume
        const hue = i / bufferLength * 180 + 180; // Blues/purples
        const saturation = 80 + avgVolume * 20;
        const lightness = 50 + avgVolume * 10;
        
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        
        // Draw rounded bars
        const barX = x + barWidth * 0.1;
        const barY = canvasHeight - barHeight;
        const barW = barWidth * 0.8;
        
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barHeight, 4);
        ctx.fill();
        
        x += barWidth;
      }
      
      // Detect silence - only if we've been recording long enough
      if (isListeningForSilence && 
          Date.now() - recordingStartTime > forceCaptureTime && // Ensure minimum recording time
          avgVolume < silenceThreshold / 100) {
        if (!silenceStartRef.current) {
          silenceStartRef.current = Date.now();
          console.log('Potential silence detected, starting silence timer');
        } else if (Date.now() - silenceStartRef.current > silenceDuration) {
          console.log('🤫 Silence confirmed after sufficient duration. Stopping recording...');
          if (onSilenceDetected) onSilenceDetected();
          cancelAnimationFrame(animationRef.current);
        }
      } else {
        if (silenceStartRef.current) {
          console.log('Audio detected, resetting silence timer');
          silenceStartRef.current = null;
        }
      }
    };
    
    draw();
    
    return () => {
      cancelAnimationFrame(animationRef.current);
      source.disconnect();
      audioCtx.close();
    };
  }, [stream, onSilenceDetected]);
  
  return (
    <div className="audio-visualizer-container">
      <motion.canvas 
        ref={canvasRef} 
        width="600" 
        height="120" 
        className="audio-visualizer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      />
      
      <div className="volume-indicator">
        <div className="volume-label">Volume</div>
        <div className="volume-meter">
          <motion.div 
            className="volume-level"
            style={{ width: `${volumeLevel}%` }}
            animate={{ width: `${volumeLevel}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </div>
    </div>
  );
};

export default AudioVisualizer;
