// src/components/audio/AudioVisualizer.js
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BsMic, BsStopwatch } from 'react-icons/bs';

/**
 * Enhanced audio visualizer with improved user feedback
 */
const AudioVisualizer = ({ 
  stream, 
  onSilenceDetected, 
  silenceThreshold = 15,  
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
  const [recordingTime, setRecordingTime] = useState(0);
  const [showRecordingTimer, setShowRecordingTimer] = useState(false);
  const [silenceStatus, setSilenceStatus] = useState(null);
  
  // Format time in mm:ss format
  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Timer effect for recording duration display
  useEffect(() => {
    let timerInterval;
    
    if (stream) {
      recordingStartTimeRef.current = Date.now();
      setShowRecordingTimer(true);
      
      timerInterval = setInterval(() => {
        const elapsed = Date.now() - recordingStartTimeRef.current;
        setRecordingTime(elapsed);
      }, 100);
    }
    
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [stream]);
  
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
        
        // Enhanced bar color based on frequency and volume
        const hue = i / bufferLength * 180 + 180; // Blues/purples
        const saturation = 80 + avgVolume * 20;
        const lightness = 50 + avgVolume * 10;
        
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        
        // Draw rounded bars with animation
        const barX = x + barWidth * 0.1;
        const barY = canvasHeight - barHeight;
        const barW = barWidth * 0.8;
        
        // Add a slight bounce effect based on the frequency
        const bounceOffset = Math.sin(Date.now() * 0.005 + i * 0.1) * 2;
        
        ctx.beginPath();
        ctx.roundRect(barX, barY + bounceOffset, barW, barHeight - bounceOffset, 4);
        ctx.fill();
        
        x += barWidth;
      }
      
      // Add central waveform
      ctx.beginPath();
      ctx.moveTo(0, canvasHeight / 2);
      
      const sliceWidth = canvasWidth / bufferLength;
      x = 0;
      
      // Draw a flowing wave in the middle
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 255.0;
        const y = canvasHeight / 2 + v * canvasHeight * 0.2 * Math.sin(x / 50 + Date.now() / 1000);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.lineTo(canvasWidth, canvasHeight / 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Detect silence - only if we're listening for it
      if (isListeningForSilence && volumePercent < silenceThreshold) {
        if (!silenceStartRef.current) {
          silenceStartRef.current = Date.now();
          setSilenceStatus('detecting');
          console.log('Potential silence detected, starting silence timer');
        } else {
          const silenceTime = Date.now() - silenceStartRef.current;
          // Update progress toward silence detection
          const silenceProgress = Math.min(silenceTime / silenceDuration, 1);
          setSilenceStatus({ detecting: true, progress: silenceProgress });
          
          if (silenceTime > silenceDuration) {
            console.log('Silence confirmed after sufficient duration. Stopping recording...');
            setSilenceStatus('confirmed');
            if (onSilenceDetected) onSilenceDetected();
            cancelAnimationFrame(animationRef.current);
          }
        }
      } else {
        if (silenceStartRef.current) {
          console.log('Audio detected, resetting silence timer');
          silenceStartRef.current = null;
          setSilenceStatus(null);
        }
      }
    };
    
    draw();
    
    return () => {
      clearTimeout(maxRecordingTimer);
      cancelAnimationFrame(animationRef.current);
      source.disconnect();
      audioCtx.close();
      setShowRecordingTimer(false);
      setSilenceStatus(null);
    };
  }, [stream, onSilenceDetected, silenceThreshold, silenceDuration, minRecordingTime, maxRecordingTime, isListeningForSilence]);
  
  return (
    <div className="audio-visualizer-container">
      {/* Recording status indicator */}
      {showRecordingTimer && (
        <motion.div 
          className="recording-status"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem',
            fontSize: '0.9rem',
            color: '#ef476f'
          }}
        >
          <div className="recording-pulse" style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#ef476f',
            animation: 'pulse 1.5s infinite'
          }}></div>
          <span>Recording... {formatTime(recordingTime)}</span>
          
          {silenceStatus && silenceStatus.detecting && (
            <div className="silence-progress" style={{
              marginLeft: '8px',
              width: '50px',
              height: '4px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${silenceStatus.progress * 100}%`,
                backgroundColor: '#06d6a0',
                transition: 'width 0.1s linear'
              }}></div>
            </div>
          )}
        </motion.div>
      )}
      
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
        
        {/* Silence threshold indicator */}
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
      
      {/* Voice prompt */}
      <motion.div 
        className="voice-prompt"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        style={{
          textAlign: 'center',
          marginTop: '8px',
          color: '#8d99ae',
          fontSize: '0.9rem'
        }}
      >
        {isListeningForSilence ? 
          "Speak clearly and pause when you're done" : 
          "Preparing to record your answer..."}
      </motion.div>
      
      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default AudioVisualizer;
