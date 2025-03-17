// src/components/MicrophoneDiagnostics.js
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BsMic, BsMicMute, BsInfoCircle, BsExclamationTriangle } from 'react-icons/bs';

const MicrophoneDiagnostics = ({ onClose }) => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [testStream, setTestStream] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testActive, setTestActive] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [errorLog, setErrorLog] = useState([]);

  // Fetch available audio devices on mount
  useEffect(() => {
    async function getDevices() {
      setIsLoading(true);
      try {
        // First, request permission by trying to open a stream
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          tempStream.getTracks().forEach(track => track.stop());
        } catch (err) {
          logError('Initial permission request failed', err);
        }
        
        // Now list devices
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = deviceList.filter(device => device.kind === 'audioinput');
        setDevices(audioInputs);
        
        if (audioInputs.length > 0) {
          setSelectedDevice(audioInputs[0].deviceId);
        } else {
          setTestResult({
            success: false,
            message: 'No audio input devices detected'
          });
        }
      } catch (err) {
        logError('Error enumerating devices', err);
        setTestResult({
          success: false,
          message: 'Could not enumerate devices: ' + err.message
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    getDevices();
    
    // Cleanup listener
    return () => {
      if (testStream) {
        testStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [testStream]);
  
  // Log errors for diagnostics
  const logError = (message, error) => {
    const entry = {
      time: new Date().toISOString(),
      message,
      errorName: error.name,
      errorMessage: error.message
    };
    setErrorLog(prev => [...prev, entry]);
  };

  // Start a test recording
  const startTest = async () => {
    setTestActive(true);
    setIsLoading(true);
    setTestResult(null);
    
    // Clean up previous stream if exists
    if (testStream) {
      testStream.getTracks().forEach(track => track.stop());
      setTestStream(null);
    }
    
    try {
      // Try to open the stream with the selected device
      const constraints = {
        audio: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setTestStream(stream);
      
      // Set up audio analysis
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      
      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Check for audio
      let silenceCounter = 0;
      let audioDetected = false;
      
      const checkAudio = () => {
        if (!testActive) return;
        
        analyzer.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength / 255;
        setVolumeLevel(avg * 100);
        
        // Check if we have sound
        if (avg > 0.05) { // Threshold for considering it "sound"
          audioDetected = true;
        } else {
          silenceCounter++;
        }
        
        // After 3 seconds of checking
        if (testActive && (audioDetected || silenceCounter >= 30)) {
          if (audioDetected) {
            setTestResult({
              success: true,
              message: 'Microphone working properly! Audio detected.'
            });
          } else {
            setTestResult({
              success: false,
              message: 'No audio detected. Please check your microphone.'
            });
          }
          
          // Clean up
          clearInterval(checkInterval);
          audioContext.close();
        }
      };
      
      const checkInterval = setInterval(checkAudio, 100);
      
      setTestResult({
        success: null,
        message: 'Testing microphone... Please speak now.'
      });
      
    } catch (err) {
      logError('Error accessing microphone', err);
      
      let errorMessage = 'Could not access microphone';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please allow microphone access in your browser.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Microphone not found or not available.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Microphone is in use by another application.';
      } else {
        errorMessage = `Microphone error: ${err.name} - ${err.message}`;
      }
      
      setTestResult({
        success: false,
        message: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Stop the test
  const stopTest = () => {
    setTestActive(false);
    
    if (testStream) {
      testStream.getTracks().forEach(track => track.stop());
      setTestStream(null);
    }
    
    setVolumeLevel(0);
  };

  // Render browser information
  const getBrowserInfo = () => {
    const browserInfo = [];
    
    browserInfo.push(`User Agent: ${navigator.userAgent}`);
    
    if (navigator.mediaDevices) {
      browserInfo.push('MediaDevices API: Available');
    } else {
      browserInfo.push('MediaDevices API: Not Available');
    }
    
    if (window.MediaRecorder) {
      browserInfo.push('MediaRecorder API: Available');
      
      // Check some commonly supported MIME types
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4'
      ];
      
      const supported = mimeTypes
        .filter(type => MediaRecorder.isTypeSupported(type))
        .join(', ');
      
      browserInfo.push(`Supported audio MIME types: ${supported || 'None detected'}`);
    } else {
      browserInfo.push('MediaRecorder API: Not Available');
    }
    
    return browserInfo;
  };

  return (
    <motion.div
      className="mic-diagnostics-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        maxWidth: '600px',
        width: '100%'
      }}
    >
      <div className="mic-diagnostics-header" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BsMic /> Microphone Diagnostics
        </h2>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          Use this tool to troubleshoot microphone issues
        </p>
      </div>

      <div className="mic-diagnostics-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Device Selection */}
        <div className="mic-selection">
          <label htmlFor="deviceSelect" style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
            Available Microphones:
          </label>
          <select
            id="deviceSelect"
            value={selectedDevice || ''}
            onChange={(e) => setSelectedDevice(e.target.value)}
            disabled={isLoading || testActive || devices.length === 0}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #ccc',
              fontSize: '1rem'
            }}
          >
            {devices.length === 0 ? (
              <option value="">No microphones detected</option>
            ) : (
              devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${devices.indexOf(device) + 1}`}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Test Controls */}
        <div className="test-controls" style={{ display: 'flex', gap: '1rem' }}>
          {!testActive ? (
            <button
              onClick={startTest}
              disabled={isLoading || devices.length === 0}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#4361ee',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: devices.length === 0 ? 'not-allowed' : 'pointer',
                opacity: devices.length === 0 ? 0.6 : 1
              }}
            >
              {isLoading ? 'Initializing...' : 'Start Microphone Test'}
            </button>
          ) : (
            <button
              onClick={stopTest}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#ef476f',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Stop Test
            </button>
          )}
        </div>

        {/* Volume Meter */}
        {testActive && (
          <div className="volume-meter-container" style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span>Input Level</span>
              <span>{Math.round(volumeLevel)}%</span>
            </div>
            <div
              style={{
                width: '100%',
                height: '1rem',
                backgroundColor: '#f0f0f0',
                borderRadius: '0.5rem',
                overflow: 'hidden'
              }}
            >
              <motion.div
                style={{
                  height: '100%',
                  backgroundColor: volumeLevel > 50 ? '#4361ee' : volumeLevel > 20 ? '#ffd166' : '#ef476f',
                  width: `${volumeLevel}%`
                }}
                animate={{ width: `${volumeLevel}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>
        )}

        {/* Test Result */}
        {testResult && (
          <div
            className={`test-result ${testResult.success === true ? 'success' : testResult.success === false ? 'error' : 'pending'}`}
            style={{
              padding: '1rem',
              borderRadius: '8px',
              backgroundColor: testResult.success === true 
                ? 'rgba(6, 214, 160, 0.1)' 
                : testResult.success === false 
                ? 'rgba(239, 71, 111, 0.1)'
                : 'rgba(255, 209, 102, 0.1)',
              border: `1px solid ${
                testResult.success === true 
                  ? '#06d6a0' 
                  : testResult.success === false 
                  ? '#ef476f'
                  : '#ffd166'
              }`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            {testResult.success === true ? (
              <BsMic style={{ color: '#06d6a0', fontSize: '1.5rem' }} />
            ) : testResult.success === false ? (
              <BsMicMute style={{ color: '#ef476f', fontSize: '1.5rem' }} />
            ) : (
              <BsInfoCircle style={{ color: '#ffd166', fontSize: '1.5rem' }} />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Browser Info */}
        <div className="browser-info" style={{ marginTop: '1rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
            <BsInfoCircle /> System Information
          </h3>
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              padding: '1rem',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontFamily: 'monospace'
            }}
          >
            {getBrowserInfo().map((info, index) => (
              <div key={index} style={{ marginBottom: '0.5rem' }}>
                {info}
              </div>
            ))}
          </div>
        </div>

        {/* Error Log */}
        {errorLog.length > 0 && (
          <div className="error-log" style={{ marginTop: '1rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
              <BsExclamationTriangle style={{ color: '#ef476f' }} /> Error Log
            </h3>
            <div
              style={{
                backgroundColor: 'rgba(239, 71, 111, 0.05)',
                padding: '1rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontFamily: 'monospace',
                maxHeight: '150px',
                overflowY: 'auto'
              }}
            >
              {errorLog.map((error, index) => (
                <div key={index} style={{ marginBottom: '0.75rem' }}>
                  <div>[{error.time.split('T')[1].split('.')[0]}] {error.message}</div>
                  <div style={{ color: '#ef476f' }}>{error.errorName}: {error.errorMessage}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Troubleshooting suggestions */}
        <div className="troubleshooting" style={{ marginTop: '1rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
            <BsInfoCircle /> Troubleshooting Steps
          </h3>
          <ol style={{ margin: '0.5rem 0 0 1.5rem', padding: 0 }}>
            <li style={{ marginBottom: '0.5rem' }}>Check if your microphone is properly connected</li>
            <li style={{ marginBottom: '0.5rem' }}>Make sure you've given browser permission to use the microphone</li>
            <li style={{ marginBottom: '0.5rem' }}>Close other applications that might be using the microphone</li>
            <li style={{ marginBottom: '0.5rem' }}>Try a different browser (Chrome or Firefox recommended)</li>
            <li style={{ marginBottom: '0.5rem' }}>Check your system sound settings to ensure the correct microphone is selected and not muted</li>
          </ol>
        </div>
      </div>

      <div className="mic-diagnostics-footer" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onClose}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#8d99ae',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Close
        </button>
      </div>
    </motion.div>
  );
};

export default MicrophoneDiagnostics;
