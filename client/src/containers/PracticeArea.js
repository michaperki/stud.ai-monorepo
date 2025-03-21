import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import WordDisplay from '../components/word/WordDisplay';
import AudioVisualizer from '../components/audio/AudioVisualizer';
import NoMicControls from '../components/ui/NoMicControls';
import StatusIndicator from '../components/feedback/StatusIndicator';
import FeedbackDisplay from '../components/feedback/FeedbackDisplay';
import HintDisplay from '../components/word/HintDisplay';

/**
 * Practice area for active session with word display and audio controls
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
  return (
    <AnimatePresence mode="wait">
      <motion.div 
        className="practice-area" 
        key="practice" 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        exit={{ opacity: 0, y: -20 }} 
        transition={{ duration: 0.3 }}
      >
        <WordDisplay
          word={state.currentWord}
          ttsAudio={state.ttsAudio}
          onReplayTts={handleReplayTts}
          loading={state.loading}
          sessionPaused={state.session.paused}
          hint={state.hintText}
          metadata={state.wordMetadata}
          onPlayCorrectPronunciation={handlePlayCorrectPronunciation}
        />

        {stream && !state.practiceWithoutMic && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.3 }}
          >
            <AudioVisualizer
              stream={stream}
              onSilenceDetected={stopRecording}
              silenceThreshold={audioSettings.silenceThreshold}
              silenceDuration={audioSettings.silenceDuration}
              minRecordingTime={audioSettings.minRecordingTime}
              maxRecordingTime={audioSettings.maxRecordingTime}
            />
          </motion.div>
        )}

        {state.practiceWithoutMic && 
         state.recordingState === 'no-mic-mode' && 
         !state.feedback && (
          <NoMicControls 
            onCorrect={() => handleManualFeedback(true)} 
            onIncorrect={() => handleManualFeedback(false)} 
            onReplayTts={handleReplayTts} 
            loading={state.loading} 
            sessionPaused={state.session.paused} 
          />
        )}

        <StatusIndicator recordingState={state.recordingState} />

        <AnimatePresence>
          {state.feedback && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }} 
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
        
        {/* Display hint using the consolidated HintDisplay component */}
        {state.enhancedHint && <HintDisplay hint={state.enhancedHint} />}
      </motion.div>
    </AnimatePresence>
  );
};

export default PracticeArea;
