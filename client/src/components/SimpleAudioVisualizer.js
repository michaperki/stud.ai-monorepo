// src/components/SimpleAudioVisualizer.js
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const SimpleAudioVisualizer = ({ 
  stream, 
  onSilenceDetected, 
  silenceThreshold = 15,  // Default values, will be overridden by props
  silenceDuration = 1000,
  minRecordingTime = 500,
  maxRecordingTime = 8000 
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const silenceStartRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isListeningForSilence, setIsListeningForSilence] = useState(false);
  
  useEffect(() => {
    if (!stream || !canvasRef.current) return;
    
    recordingStartTimeRef.current = Date.now();
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
    
    // Enable silence detection after minimum recording time
    setTimeout(() => {
      console.log('Silence detection activated after initial delay');
      setIsListeningForSilence(true);
    }, minRecordingTime);
    
    // Set a maximum recording duration
    const maxRecordingTimer = setTimeout(() => {
      console.log('Maximum recording time reached, stopping recording');
      if (onSilenceDetected) onSilenceDetected();
      cancelAnimationFrame(animationRef.current);
    }, maxRecordingTime);
    
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
      const volumePercent = avgVolume * 100;
      setVolumeLevel(volumePercent);
      
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
      
      // Detect silence - only if we're listening for it
      if (isListeningForSilence && volumePercent < silenceThreshold) {
        if (!silenceStartRef.current) {
          silenceStartRef.current = Date.now();
          console.log('Potential silence detected, starting silence timer');
        } else if (Date.now() - silenceStartRef.current > silenceDuration) {
          console.log('Silence confirmed after sufficient duration. Stopping recording...');
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
      clearTimeout(maxRecordingTimer);
      cancelAnimationFrame(animationRef.current);
      source.disconnect();
      audioCtx.close();
    };
  }, [stream, onSilenceDetected, silenceThreshold, silenceDuration, minRecordingTime, maxRecordingTime, isListeningForSilence]);
  
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
        {isListeningForSilence && (
          <div className="silence-threshold-indicator" style={{ 
            position: 'relative', 
            left: `${silenceThreshold}%`, 
            top: '-8px',
            width: '2px',
            height: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.5)'
          }} />
        )}
      </div>
    </div>
  );
};

export default SimpleAudioVisualizer;
