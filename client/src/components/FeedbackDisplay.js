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
} from 'react-icons/bs';

const FeedbackDisplay = ({ 
  feedback, 
  loading, 
  onNextWord, 
  sessionPaused, 
  onPlayCorrectPronunciation,
  autoAdvanceDelay = 5,
  userRecordingUrl = null // New prop for user's recording
}) => {
  // State for the countdown value.
  const [countdown, setCountdown] = useState(null);
  // activeFeedbackKey holds a stable identifier (here, the user_response) for the current correct feedback.
  const [activeFeedbackKey, setActiveFeedbackKey] = useState(null);
  // Ref for the timer so we can prevent re‑starting it.
  const countdownTimerRef = useRef(null);
  // Ref for onNextWord so that changes in the callback don't trigger our effect.
  const onNextWordRef = useRef(onNextWord);
  // Audio element ref for recording playback
  const audioRef = useRef(null);
  // State to track if user recording is playing
  const [isPlayingUserRecording, setIsPlayingUserRecording] = useState(false);

  useEffect(() => {
    onNextWordRef.current = onNextWord;
  }, [onNextWord]);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      
      // Add event listeners to handle playback state
      audioRef.current.addEventListener('play', () => setIsPlayingUserRecording(true));
      audioRef.current.addEventListener('pause', () => setIsPlayingUserRecording(false));
      audioRef.current.addEventListener('ended', () => setIsPlayingUserRecording(false));
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
      audioRef.current.src = userRecordingUrl;
    }
  }, [userRecordingUrl]);

  // Cleanup function for the timer.
  const cleanupTimer = () => {
    if (countdownTimerRef.current) {
      console.log('[Countdown] Clearing timer.');
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  // Monitor feedback changes and update the activeFeedbackKey.
  useEffect(() => {
    console.log('[Feedback Monitor] New feedback received:', feedback);
    if (feedback && feedback.is_correct) {
      if (activeFeedbackKey !== feedback.user_response) {
        console.log('[Feedback Monitor] New correct feedback detected. Setting key:', feedback.user_response);
        setActiveFeedbackKey(feedback.user_response);
      }
    } else {
      if (activeFeedbackKey !== null) {
        console.log('[Feedback Monitor] Clearing active feedback key.');
      }
      setActiveFeedbackKey(null);
    }
  }, [feedback, activeFeedbackKey]);

  // Countdown effect: start timer only when there is an active correct feedback.
  useEffect(() => {
    if (!activeFeedbackKey || sessionPaused || autoAdvanceDelay <= 0) {
      console.log('[Countdown Effect] Conditions not met. activeFeedbackKey:', activeFeedbackKey, 'sessionPaused:', sessionPaused, 'autoAdvanceDelay:', autoAdvanceDelay);
      cleanupTimer();
      setCountdown(null);
      return;
    }
    // If a timer is already running, do not restart it.
    if (countdownTimerRef.current) {
      console.log('[Countdown Effect] Timer already running for key:', activeFeedbackKey);
      return;
    }
    console.log('[Countdown Effect] Starting countdown for key:', activeFeedbackKey);
    setCountdown(autoAdvanceDelay);
    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        console.log('[Countdown Interval] Current count:', prev);
        if (prev <= 1) {
          cleanupTimer();
          console.log('[Countdown Interval] Countdown complete. Calling onNextWord.');
          onNextWordRef.current();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return cleanupTimer;
  }, [activeFeedbackKey, sessionPaused, autoAdvanceDelay]);

  const cancelAutoAdvance = () => {
    console.log('[Cancel] User cancelled auto-advance.');
    cleanupTimer();
    setCountdown(null);
  };

  // Function to play/pause user's recording
  const toggleUserRecording = () => {
    if (!audioRef.current || !userRecordingUrl) {
      console.error('No user recording available to play');
      return;
    }

    try {
      if (isPlayingUserRecording) {
        audioRef.current.pause();
      } else {
        // This resets the audio to the beginning if it was already played
        if (audioRef.current.currentTime > 0 && audioRef.current.currentTime === audioRef.current.duration) {
          audioRef.current.currentTime = 0;
        }
        
        // Use a promise to catch any errors during playback
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('Error playing user recording:', error);
            // Special handling for mobile autoplay restrictions
            if (error.name === 'NotAllowedError') {
              console.warn('Autoplay prevented by browser. This may be due to mobile browser restrictions.');
            }
          });
        }
      }
    } catch (error) {
      console.error('Error toggling user recording playback:', error);
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
            {userRecordingUrl && (
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
