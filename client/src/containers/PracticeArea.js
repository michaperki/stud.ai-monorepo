// src/containers/PracticeArea.js
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, AnimateSharedLayout } from 'framer-motion';

// Import enhanced components
import WordDisplay from '../components/word/WordDisplay';
import AudioVisualizer from '../components/audio/AudioVisualizer';
import NoMicControls from '../components/ui/NoMicControls';
import StatusIndicator from '../components/feedback/StatusIndicator';
import FeedbackDisplay from '../components/feedback/FeedbackDisplay';
import HintDisplay from '../components/word/HintDisplay';

/**
 * Enhanced practice area for active session with word display and audio controls
 */
const PracticeArea = ({
  state,
  stream,
  audioSettings,
  stopRecording,
  handleReplayTts,
  handleManualFeedback,
  handleNextWord,
  handlePlayCorrectPronunciation,
  userRecordingUrl
}) => {
  const [recordingStatus, setRecordingStatus] = useState('inactive');
  
  // Update recording status based on recordingState
  useEffect(() => {
    switch(state.recordingState) {
      case 'recording':
        setRecordingStatus('recording');
        break;
      case 'recorded':
        setRecordingStatus('processing');
        break;
      case 'idle':
      default:
        setRecordingStatus('inactive');
        break;
    }
  }, [state.recordingState]);
  
  // When feedback appears, change recording status to completed
  useEffect(() => {
    if (state.feedback) {
      setRecordingStatus('completed');
    }
  }, [state.feedback]);
  
  // Prepare practice instructions based on current state
  const getPracticeInstructions = () => {
    if (state.practiceWithoutMic) {
      return "Listen to the word and practice saying it aloud. Then select whether you pronounced it correctly.";
    }
    
    if (state.recordingState === 'idle' && state.currentWord && !state.feedback) {
      return "Listen to the word and click on it to hear again. Then start speaking to record your pronunciation.";
    }
    
    if (state.recordingState === 'recording') {
      return "Speak clearly. Recording will stop automatically when you finish speaking.";
    }
    
    return null;
  };
  
  const instructions = getPracticeInstructions();
  
  return (
    <motion.div 
      className="practice-area" 
      key="practice" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      transition={{ duration: 0.4 }}
      layout
    >
      {/* Fixed height content container to prevent layout shifts */}
      <div className="practice-content-container">
        {/* Instructions */}
        <AnimatePresence mode="wait">
          {instructions && (
            <motion.div 
              className="practice-instructions"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              layout
            >
              {instructions}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Word Display - Always Present */}
        <motion.div className="practice-section word-section" layout>
          <WordDisplay
            word={state.currentWord}
            ttsAudio={state.ttsAudio}
            onReplayTts={handleReplayTts}
            loading={state.loading}
            sessionPaused={state.session.paused}
            hint={state.hintText}
            metadata={state.wordMetadata}
            onPlayCorrectPronunciation={handlePlayCorrectPronunciation}
            recordingStatus={recordingStatus}
            suppressInitialPlayback={false}
          />
        </motion.div>

        {/* Audio Visualization Area - Reserved Space */}
        <motion.div 
          className="practice-section audio-section"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: stream && !state.practiceWithoutMic ? 1 : 0,
            height: stream && !state.practiceWithoutMic ? 'auto' : '0px'
          }}
          transition={{ duration: 0.3 }}
          layout
        >
          {stream && !state.practiceWithoutMic && (
            <AudioVisualizer
              stream={stream}
              onSilenceDetected={stopRecording}
              silenceThreshold={audioSettings.silenceThreshold}
              silenceDuration={audioSettings.silenceDuration}
              minRecordingTime={audioSettings.minRecordingTime}
              maxRecordingTime={audioSettings.maxRecordingTime}
            />
          )}
        </motion.div>

        {/* Reserved space for No-Mic Controls or Feedback */}
        <motion.div 
          className="practice-section controls-feedback-section"
          layout
        >
          {/* No microphone controls */}
          <AnimatePresence mode="wait">
            {state.practiceWithoutMic && 
            state.recordingState === 'no-mic-mode' && 
            !state.feedback && (
              <motion.div
                key="no-mic-controls"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <NoMicControls 
                  onCorrect={() => handleManualFeedback(true)} 
                  onIncorrect={() => handleManualFeedback(false)} 
                  onReplayTts={handleReplayTts} 
                  loading={state.loading} 
                  sessionPaused={state.session.paused} 
                />
              </motion.div>
            )}

            {/* Feedback display */}
            {state.feedback && (
              <motion.div 
                key="feedback-display"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <FeedbackDisplay
                  feedback={state.feedback}
                  loading={state.loading}
                  onNextWord={handleNextWord}
                  sessionPaused={state.session.paused}
                  onPlayCorrectPronunciation={handlePlayCorrectPronunciation}
                  autoAdvanceDelay={state.settings.autoAdvanceDelay}
                  userRecordingUrl={userRecordingUrl}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Status indicator - only show when no feedback is present */}
        <motion.div 
          className="practice-section status-section"
          layout
        >
          <AnimatePresence mode="wait">
            {!state.feedback && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <StatusIndicator 
                  recordingState={state.recordingState} 
                  feedbackVisible={!!state.feedback} 
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        
        {/* Display hint */}
        <motion.div 
          className="practice-section hint-section"
          layout
        >
          <AnimatePresence mode="wait">
            {state.enhancedHint && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
              >
                <HintDisplay hint={state.enhancedHint} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default PracticeArea;
