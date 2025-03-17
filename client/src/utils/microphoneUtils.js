// src/utils/microphoneUtils.js

/**
 * Checks if the browser supports required audio APIs
 * @returns {Object} Support status of various audio APIs
 */
export const checkBrowserSupport = () => {
  const support = {
    mediaDevices: !!navigator.mediaDevices,
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    mediaRecorder: !!window.MediaRecorder,
    audioContext: !!window.AudioContext || !!window.webkitAudioContext,
    supportedTypes: []
  };
  
  // Check supported MIME types if MediaRecorder is available
  if (support.mediaRecorder) {
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/wav'
    ];
    
    support.supportedTypes = mimeTypes.filter(type => MediaRecorder.isTypeSupported(type));
  }
  
  return support;
};

/**
 * Checks if the browser can access audio devices
 * @returns {Promise<Object>} Results of the device check
 */
export const checkAudioDevices = async () => {
  try {
    // First check if the browser supports the required APIs
    const support = checkBrowserSupport();
    if (!support.getUserMedia) {
      return {
        success: false,
        devices: [],
        error: 'Your browser does not support microphone access',
        errorCode: 'BROWSER_UNSUPPORTED'
      };
    }
    
    // Try to enumerate devices
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      if (audioInputs.length === 0) {
        return {
          success: false,
          devices: [],
          error: 'No microphones detected on your device',
          errorCode: 'NO_DEVICES'
        };
      }
      
      // We found devices, now check if we can access at least one
      try {
        // Try to get permission by opening a test stream
        const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Get labels after permission is granted
        const updatedDevices = await navigator.mediaDevices.enumerateDevices();
        const audioInputsWithLabels = updatedDevices.filter(device => device.kind === 'audioinput');
        
        // Stop all tracks in the test stream
        testStream.getTracks().forEach(track => track.stop());
        
        return {
          success: true,
          devices: audioInputsWithLabels,
          error: null,
          errorCode: null
        };
      } catch (accessError) {
        // Permission or device access was denied
        return {
          success: false,
          devices: audioInputs,
          error: getErrorMessage(accessError),
          errorCode: accessError.name
        };
      }
    } catch (enumerationError) {
      // Failed to enumerate devices
      return {
        success: false,
        devices: [],
        error: `Device enumeration failed: ${enumerationError.message}`,
        errorCode: enumerationError.name
      };
    }
  } catch (error) {
    // Unexpected error
    return {
      success: false,
      devices: [],
      error: `Unexpected error checking audio devices: ${error.message}`,
      errorCode: error.name
    };
  }
};

/**
 * Test if a specific microphone works by recording a short sample
 * @param {string} deviceId - Device ID to test (optional)
 * @returns {Promise<Object>} Results of the test
 */
export const testMicrophone = async (deviceId = null) => {
  let testStream = null;
  let audioContext = null;
  
  try {
    // Configure audio constraints
    const constraints = {
      audio: deviceId 
        ? { deviceId: { exact: deviceId } }
        : true
    };
    
    // Try to open the audio stream
    testStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Create and start a test recorder
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(testStream);
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 256;
    source.connect(analyzer);
    
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Check for actual audio input for 2 seconds
    let detectedVolume = 0;
    
    // Create a promise that resolves after 2 seconds of analysis
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkAudio = () => {
        analyzer.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avgVolume = sum / bufferLength;
        
        // Keep track of the highest volume detected
        detectedVolume = Math.max(detectedVolume, avgVolume);
        
        // Continue checking until 2 seconds have passed
        if (Date.now() - startTime < 2000) {
          requestAnimationFrame(checkAudio);
        } else {
          // Test complete - clean up resources
          if (testStream) {
            testStream.getTracks().forEach(track => track.stop());
          }
          
          if (audioContext) {
            audioContext.close();
          }
          
          // Return results
          if (detectedVolume > 10) { // Threshold for detecting audio
            resolve({
              success: true,
              volumeDetected: detectedVolume / 255 * 100, // Convert to percentage
              deviceId: deviceId,
              error: null
            });
          } else {
            resolve({
              success: false,
              volumeDetected: detectedVolume / 255 * 100,
              deviceId: deviceId,
              error: 'No audio input detected. Please check if your microphone is working and not muted.'
            });
          }
        }
      };
      
      // Start checking audio
      checkAudio();
    });
    
  } catch (error) {
    // Clean up resources on error
    if (testStream) {
      testStream.getTracks().forEach(track => track.stop());
    }
    
    if (audioContext) {
      audioContext.close();
    }
    
    return {
      success: false,
      volumeDetected: 0,
      deviceId: deviceId,
      error: getErrorMessage(error),
      errorCode: error.name
    };
  }
};

/**
 * Get a user-friendly error message from common microphone errors
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error) => {
  switch (error.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Microphone access denied. Please allow microphone access in your browser settings.';
      
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No microphone found. Please connect a microphone and try again.';
      
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Your microphone is in use by another application. Please close other apps that might be using it.';
      
    case 'OverconstrainedError':
      return 'The requested microphone constraints cannot be satisfied.';
      
    case 'AbortError':
      return 'Microphone access was aborted. Please try again.';
      
    case 'SecurityError':
      return 'Microphone access is blocked due to security settings.';
      
    case 'TypeError':
      return 'Invalid audio constraints provided.';
      
    default:
      return `Microphone error: ${error.message || 'Unknown error'}`;
  }
};
