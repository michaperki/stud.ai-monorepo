
// src/components/AudioVisualizer.js
import React, { useEffect, useRef } from 'react';

const AudioVisualizer = ({ stream, onSilenceDetected }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const silenceStartRef = useRef(null);
  const silenceThreshold = 20;
  const silenceDuration = 1500; // Time to confirm silence (1.5 sec)
  const initialDelay = 1000; // 1 second delay before silence detection starts
  let isListeningForSilence = false;

  useEffect(() => {
    if (!stream || !canvasRef.current) return;
    
    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 512;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    setTimeout(() => {
      isListeningForSilence = true; // Enable silence detection after delay
    }, initialDelay);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'white';
      ctx.beginPath();
      let sum = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 255.0;
        sum += v;
        const x = (i / bufferLength) * canvas.width;
        const y = v * canvas.height;
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      const avgVolume = sum / bufferLength;

      if (isListeningForSilence && avgVolume < silenceThreshold / 100) {
        if (!silenceStartRef.current) {
          silenceStartRef.current = Date.now();
        } else if (Date.now() - silenceStartRef.current > silenceDuration) {
          console.log('🤫 Silence detected! Stopping recording...');
          if (onSilenceDetected) onSilenceDetected();
          cancelAnimationFrame(animationRef.current);
        }
      } else {
        silenceStartRef.current = null;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
      source.disconnect();
    };
  }, [stream, onSilenceDetected]);

  return <canvas ref={canvasRef} width="500" height="100" className="audio-visualizer" />;
};

export default AudioVisualizer;

