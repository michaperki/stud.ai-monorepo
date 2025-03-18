// src/components/FeedbackDisplay.js
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  BsCheckCircleFill, 
  BsXCircleFill, 
  BsArrowRightCircle, 
  BsStopwatch, 
  BsMic, 
  BsVolumeUp,
  BsFileEarmarkMusic,
  BsPauseFill,
  BsBug
} from 'react-icons/bs';

const FeedbackDisplay = ({ 
  feedback, 
  loading, 
  onNextWord, 
  sessionPaused, 
  onPlayCorrectPronunciation,
  autoAdvanceDelay = 5,
  userRecordingUrl = null
}) => {
  // State for the countdown value.
  const [countdown, setCountdown] = useState(null);
  // activeFeedbackKey holds a stable identifier for the current correct feedback.
  const [activeFeedbackKey, setActiveFeedbackKey] = useState(null);
  // Ref for the timer so we can prevent re‑starting it.
  const countdownTimerRef = useRef(null);
  // Ref for onNextWord so that changes in the callback don't trigger our effect.
  const onNextWordRef = useRef(onNextWord);
  // Audio element ref for recording playback
  const audioRef = useRef(null);
  // State to track if user recording is playing
  const [isPlayingUserRecording, setIsPlayingUserRecording] = useState(false);
  // Debug info
  const [debugInfo, setDebugInfo] = useState('');
  // State to track if we need fallback HTML5 audio
  const [useHtmlAudio, setUseHtmlAudio] = useState(false);
  // Is mobile device
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect if running on mobile
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      setIsMobile(mobileRegex.test(userAgent.toLowerCase()));
      
      // On iOS and some Android devices, let's default to HTML audio
      if (mobileRegex.test(userAgent.toLowerCase())) {
        setUseHtmlAudio(true);
        updateDebug('Mobile device detected, using HTML audio element');
      }
    };
    
    checkMobile();
  }, []);

  useEffect(() => {
    onNextWordRef.current = onNextWord;
  }, [onNextWord]);

  const updateDebug = (message) => {
    setDebugInfo(prev => {
      const newDebug = `${new Date().toISOString().substring(11, 19)}: ${message}\n${prev}`;
      // Keep debug info limited to prevent it from growing too large
      return newDebug.split('\n').slice(0, 10).join('\n');
    });
  };

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      
      // Add event listeners to handle playback state
      audioRef.current.addEventListener('play', () => {
        setIsPlayingUserRecording(true);
        updateDebug('Audio started playing');
      });
      
      audioRef.current.addEventListener('pause', () => {
        setIsPlayingUserRecording(false);
        updateDebug('Audio paused');
      });
      
      audioRef.current.addEventListener('ended', () => {
        setIsPlayingUserRecording(false);
        updateDebug('Audio playback ended');
      });
      
      audioRef.current.addEventListener('error', (e) => {
        updateDebug(`Audio error: ${e.target.error ? e.target.error.message : 'Unknown error'}`);
        setIsPlayingUserRecording(false);
      });
    }
    
    return () => {
      // Clean up audio element and event listeners
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        setIsPlayingUserRecording(false);
      }
    };
  }, []);

  // Update audio source when userRecordingUrl changes
  useEffect(() => {
    if (audioRef.current && userRecordingUrl) {
      try {
        audioRef.current.src = userRecordingUrl;
        updateDebug(`Set audio source: ${userRecordingUrl.substring(0, 30)}...`);
        
        // For mobile Safari, we need to load the audio
        audioRef.current.load();
      } catch (error) {
        updateDebug(`Error setting audio source: ${error.message}`);
      }
    }
  }, [userRecordingUrl]);

  // Cleanup function for the timer.
  const cleanupTimer = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  // Monitor feedback changes and update the activeFeedbackKey.
  useEffect(() => {
    if (feedback && feedback.is_correct) {
      if (activeFeedbackKey !== feedback.user_response) {
        setActiveFeedbackKey(feedback.user_response);
      }
    } else {
      if (activeFeedbackKey !== null) {
        setActiveFeedbackKey(null);
      }
    }
  }, [feedback, activeFeedbackKey]);

  // Countdown effect: start timer only when there is an active correct feedback.
  useEffect(() => {
    if (!activeFeedbackKey || sessionPaused || autoAdvanceDelay <= 0) {
      cleanupTimer();
      setCountdown(null);
      return;
    }
    // If a timer is already running, do not restart it.
    if (countdownTimerRef.current) {
      return;
    }
    setCountdown(autoAdvanceDelay);
    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          cleanupTimer();
          onNextWordRef.current();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return cleanupTimer;
  }, [activeFeedbackKey, sessionPaused, autoAdvanceDelay]);

  const cancelAutoAdvance = () => {
    cleanupTimer();
    setCountdown(null);
  };

  // Function to play/pause user's recording
  const toggleUserRecording = () => {
    if (!userRecordingUrl) {
      updateDebug('No recording URL available');
      return;
    }

    try {
      if (isPlayingUserRecording) {
        if (audioRef.current) {
          audioRef.current.pause();
          updateDebug('Paused audio playback');
        }
      } else {
        if (audioRef.current) {
          // Reset to beginning if needed
          if (audioRef.current.currentTime > 0 && 
              audioRef.current.currentTime === audioRef.current.duration) {
            audioRef.current.currentTime = 0;
          }
          
          // Use a promise to catch any errors during playback
          updateDebug('Attempting to play audio...');
          const playPromise = audioRef.current.play();
          
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              updateDebug(`Playback error: ${error.name} - ${error.message}`);
              
              // Special handling for mobile autoplay restrictions
              if (error.name === 'NotAllowedError') {
                updateDebug('Autoplay prevented by browser. Switching to HTML audio element.');
                setUseHtmlAudio(true);
              }
            });
          }
        } else {
          updateDebug('Audio element not initialized');
        }
      }
    } catch (error) {
      updateDebug(`Error in toggleUserRecording: ${error.message}`);
    }
  };

  if (!feedback) return null;
  const isCorrect = feedback.is_correct;

  return (
    <motion.div 
      className={`feedback-container ${isCorrect ? 'correct' : 'incorrect'}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
    >
      <div className="feedback-header">
        <div className="feedback-icon">
          {isCorrect ? (
            <BsCheckCircleFill size={24} className="icon-correct" />
          ) : (
            <BsXCircleFill size={24} className="icon-incorrect" />
          )}
        </div>
        <h3 className="feedback-title">
          {isCorrect ? 'Correct! 👏' : 'Try again! 🔄'}
        </h3>
        {countdown !== null && (
          <div className="countdown-timer">
            <BsStopwatch />
            <span>{countdown}s</span>
          </div>
        )}
      </div>
      <div className="feedback-content">
        <div className="feedback-row">
          <span className="feedback-label">Your response:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="feedback-value">{feedback.user_response}</span>
            {userRecordingUrl && !useHtmlAudio && (
              <motion.button
                className="button circle secondary"
                onClick={toggleUserRecording}
                whileTap={{ scale: 0.95 }}
                title={isPlayingUserRecording ? "Pause your recording" : "Play your recording"}
                style={{ minWidth: 'auto', padding: '0.25rem' }}
              >
                {isPlayingUserRecording ? 
                  <BsPauseFill size={16} /> : 
                  <BsFileEarmarkMusic size={16} />
                }
              </motion.button>
            )}
            {userRecordingUrl && useHtmlAudio && (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <audio 
                  controls 
                  src={userRecordingUrl} 
                  style={{ height: '24px', marginLeft: '8px' }}
                  onPlay={() => setIsPlayingUserRecording(true)}
                  onPause={() => setIsPlayingUserRecording(false)}
                  onEnded={() => setIsPlayingUserRecording(false)}
                  onError={(e) => updateDebug(`HTML audio error: ${e.target.error ? e.target.error.message : 'Unknown'}`)}
                />
              </div>
            )}
          </div>
        </div>
        <div className="feedback-row">
          <span className="feedback-label">Correct answer:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="feedback-value">{feedback.correct_answer}</span>
            <motion.button
              className="button circle secondary"
              onClick={onPlayCorrectPronunciation}
              disabled={loading || sessionPaused}
              whileTap={{ scale: 0.95 }}
              title="Play correct pronunciation"
              style={{ minWidth: 'auto', padding: '0.25rem' }}
            >
              <BsVolumeUp size={16} />
            </motion.button>
          </div>
        </div>
        {feedback.pronunciation_score && (
          <div className="feedback-row">
            <span className="feedback-label">Pronunciation score:</span>
            <div className="score-bar-container">
              <div 
                className="score-bar" 
                style={{ width: `${feedback.pronunciation_score}%` }}
              />
              <span className="score-text">{feedback.pronunciation_score}%</span>
            </div>
          </div>
        )}
        
        {/* Debug toggle button */}
        {(isMobile || debugInfo) && (
          <div className="feedback-row" style={{ marginTop: '10px' }}>
            <details>
              <summary style={{ 
                cursor: 'pointer', 
                color: '#666', 
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <BsBug /> Show debug info
              </summary>
              <div style={{ 
                marginTop: '8px', 
                padding: '8px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                overflowX: 'auto'
              }}>
                <p>Device: {isMobile ? 'Mobile' : 'Desktop'}</p>
                <p>Audio Mode: {useHtmlAudio ? 'HTML5 Audio Element' : 'JavaScript Audio API'}</p>
                <p>Recording URL: {userRecordingUrl ? '✓ Available' : '✗ Not available'}</p>
                <p>Playback state: {isPlayingUserRecording ? 'Playing' : 'Stopped'}</p>
                <p>Log:</p>
                {debugInfo || 'No debug info available'}
              </div>
            </details>
          </div>
        )}
      </div>
      <div className="feedback-buttons">
        {isCorrect ? (
          <>
            <motion.button
              className="button primary feedback-button"
              onClick={() => {
                cancelAutoAdvance();
                onNextWord();
              }}
              disabled={loading || sessionPaused}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>Next Word</span>
              <BsArrowRightCircle size={18} />
            </motion.button>
            {countdown !== null && (
              <motion.button
                className="button outline feedback-button"
                onClick={cancelAutoAdvance}
                disabled={loading || sessionPaused}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>Stay on This Word</span>
                <BsStopwatch size={18} />
              </motion.button>
            )}
          </>
        ) : (
          <>
            <motion.button
              className="button secondary feedback-button"
              onClick={() => {
                cancelAutoAdvance();
                window.dispatchEvent(new CustomEvent('retry-pronunciation'));
              }}
              disabled={loading || sessionPaused}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>Try Again</span>
              <BsMic size={18} />
            </motion.button>
            <motion.button
              className="button outline feedback-button"
              onClick={() => {
                cancelAutoAdvance();
                onNextWord();
              }}
              disabled={loading || sessionPaused}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>Skip This Word</span>
              <BsArrowRightCircle size={18} />
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default FeedbackDisplay;
