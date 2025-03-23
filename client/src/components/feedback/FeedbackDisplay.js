// src/components/feedback/FeedbackDisplay.js
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BsCheckCircleFill, 
  BsXCircleFill, 
  BsArrowRightCircle, 
  BsStopwatch, 
  BsVolumeUp,
  BsFileEarmarkMusic,
  BsPauseFill
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
  // State for the countdown value
  const [countdown, setCountdown] = useState(null);
  // State for tracking if the recording is playing
  const [isPlayingUserRecording, setIsPlayingUserRecording] = useState(false);
  // Audio element reference
  const audioRef = useRef(null);
  // Countdown timer reference
  const countdownTimerRef = useRef(null);
  // Reference for the next word callback
  const onNextWordRef = useRef(onNextWord);

  // Update the callback reference when it changes
  useEffect(() => {
    onNextWordRef.current = onNextWord;
  }, [onNextWord]);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      
      // Add event listeners to handle playback state
      audioRef.current.addEventListener('play', () => {
        setIsPlayingUserRecording(true);
      });
      
      audioRef.current.addEventListener('pause', () => {
        setIsPlayingUserRecording(false);
      });
      
      audioRef.current.addEventListener('ended', () => {
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
        audioRef.current.load();
      } catch (error) {
        console.error('Error setting audio source:', error.message);
      }
    }
  }, [userRecordingUrl]);

  // Cleanup function for the timer
  const cleanupTimer = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  // Countdown effect for auto-advance
  useEffect(() => {
    // Only start timer for correct answers and when not paused
    if (feedback?.is_correct && !sessionPaused && autoAdvanceDelay > 0) {
      // Only start if a timer isn't already running
      if (!countdownTimerRef.current) {
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
      }
    } else {
      cleanupTimer();
      setCountdown(null);
    }
    
    return cleanupTimer;
  }, [feedback?.is_correct, sessionPaused, autoAdvanceDelay]);

  // Cancel auto-advance timer
  const cancelAutoAdvance = () => {
    cleanupTimer();
    setCountdown(null);
  };

  // Toggle playing the user recording
  const toggleUserRecording = () => {
    if (!userRecordingUrl) return;

    try {
      if (isPlayingUserRecording) {
        audioRef.current.pause();
      } else {
        if (audioRef.current) {
          // Reset to beginning if needed
          if (audioRef.current.currentTime > 0 && 
              audioRef.current.currentTime === audioRef.current.duration) {
            audioRef.current.currentTime = 0;
          }
          
          audioRef.current.play().catch(error => {
            console.error('Error playing audio:', error);
          });
        }
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  if (!feedback) return null;
  
  const isCorrect = feedback.is_correct;

  return (
    <motion.div 
      className="feedback-container"
      data-status={isCorrect ? 'correct' : 'incorrect'}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      layout
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
          <div className="feedback-value-container">
            <span className="feedback-value">{feedback.user_response}</span>
            {userRecordingUrl && (
              <motion.button
                className="button circle secondary"
                onClick={toggleUserRecording}
                whileTap={{ scale: 0.95 }}
                title={isPlayingUserRecording ? "Pause your recording" : "Play your recording"}
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
          <div className="feedback-value-container">
            <span className="feedback-value">{feedback.correct_answer}</span>
            <motion.button
              className="button circle secondary"
              onClick={onPlayCorrectPronunciation}
              disabled={loading || sessionPaused}
              whileTap={{ scale: 0.95 }}
              title="Play correct pronunciation"
            >
              <BsVolumeUp size={16} />
            </motion.button>
          </div>
        </div>
        
        {feedback.pronunciation_score !== undefined && (
          <div className="feedback-row">
            <span className="feedback-label">Pronunciation score:</span>
            <div className="score-bar-container">
              <motion.div 
                className="score-bar" 
                initial={{ width: '0%' }}
                animate={{ width: `${feedback.pronunciation_score}%` }}
                transition={{ duration: 0.8, type: 'spring' }}
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
              className="button primary feedback-button"
              onClick={() => {
                cancelAutoAdvance();
                window.dispatchEvent(new CustomEvent('retry-pronunciation'));
              }}
              disabled={loading || sessionPaused}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>Try Again</span>
              <BsArrowRightCircle size={18} />
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
