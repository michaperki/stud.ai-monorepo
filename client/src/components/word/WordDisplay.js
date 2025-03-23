// src/components/word/WordDisplay.js
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BsVolumeUp, BsInfoCircle, BsMicFill, BsTranslate } from 'react-icons/bs';
import WordMetadata from './WordMetaData';

const WordDisplay = ({ 
  word, 
  ttsAudio, 
  onReplayTts, 
  loading, 
  sessionPaused,
  hint,
  metadata,
  onPlayCorrectPronunciation,
  recordingStatus,
  suppressInitialPlayback = false
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [playedInitialAudio, setPlayedInitialAudio] = useState(false);
  const [showPronunciationGuide, setShowPronunciationGuide] = useState(false);
  
  // Auto-play audio when component loads with a new word
  useEffect(() => {
    if (word && ttsAudio && !playedInitialAudio && !sessionPaused && !suppressInitialPlayback) {
      setPlayedInitialAudio(true);
      const timer = setTimeout(() => {
        onReplayTts();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [word, ttsAudio, playedInitialAudio, sessionPaused, onReplayTts, suppressInitialPlayback]);
  
  // Reset played status when word changes
  useEffect(() => {
    setPlayedInitialAudio(false);
  }, [word]);
  
  // Toggle pronunciation guide
  const togglePronunciationGuide = () => {
    setShowPronunciationGuide(!showPronunciationGuide);
  };
  
  // Get phonetic breakdown for Hebrew words
  const getPhoneticBreakdown = (hebrewWord) => {
    if (!hebrewWord || !metadata || !metadata.pronunciation_guide) return [];
    
    const pronunciationGuide = metadata.pronunciation_guide;
    const syllables = pronunciationGuide.split(/[-\s]+/);
    
    return syllables.map((syllable, index) => ({
      syllable,
      primary: index === 0, // Assume first syllable has primary stress
    }));
  };
  
  const phoneticParts = metadata?.hebrew === word ? getPhoneticBreakdown(word) : [];
  const isHebrew = metadata?.hebrew === word;
  const isRecording = recordingStatus === 'recording';

  // Placeholder content for when word is not yet loaded
  if (!word) {
    return (
      <motion.div 
        className="word-display-container word-display-container-empty"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        layout
      >
        <div className="word-display">
          <div className="word-placeholder">
            <span>Ready to practice...</span>
          </div>
        </div>
      </motion.div>
    );
  }
  
  return (
    <motion.div 
      className="word-display-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      layout
    >
      {/* Word header with language indicator */}
      <div className="word-language-indicator">
        <BsTranslate />
        <span>{metadata ? (isHebrew ? 'Hebrew' : 'English') : 'Word'}</span>
      </div>
      
      {/* Main word display */}
      <motion.div 
        className={`word-display ${isRecording ? 'recording' : ''}`}
        animate={{ 
          borderColor: isRecording ? 'var(--danger-color)' : 'transparent',
          backgroundColor: isRecording ? 'rgba(239, 71, 111, 0.05)' : 'transparent'
        }}
        transition={{ duration: 0.3 }}
        layout
      >
        {/* Recording status indicator */}
        <AnimatePresence>
          {recordingStatus && recordingStatus !== 'inactive' && recordingStatus !== 'completed' && (
            <motion.div 
              className="recording-indicator"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              layout
            >
              {recordingStatus === 'recording' && (
                <>
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <BsMicFill />
                  </motion.div>
                  <span>Recording</span>
                </>
              )}
              {recordingStatus === 'processing' && <span>Processing...</span>}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* The word itself */}
        <motion.h2 
          className={isHebrew ? 'hebrew' : ''}
          layout
        >
          {word}
        </motion.h2>
        
        {/* Word controls */}
        <div className="word-display-controls">
          {ttsAudio && (
            <motion.button
              className="button circle secondary"
              onClick={onReplayTts}
              disabled={loading || sessionPaused}
              whileTap={{ scale: 0.95 }}
              title="Replay pronunciation"
            >
              <BsVolumeUp />
              {!playedInitialAudio && (
                <motion.div 
                  className="notification-dot"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: 5, duration: 1 }}
                />
              )}
            </motion.button>
          )}
          
          {metadata && (
            <motion.button
              className="button circle outline"
              onClick={() => setShowDetails(!showDetails)}
              disabled={loading || sessionPaused}
              whileTap={{ scale: 0.95 }}
              title={showDetails ? "Hide word details" : "Show word details"}
            >
              <BsInfoCircle />
            </motion.button>
          )}
        </div>
      </motion.div>
      
      {/* Pronunciation guide button */}
      <AnimatePresence>
        {metadata && metadata.pronunciation_guide && (
          <motion.button
            className="pronunciation-guide-button"
            onClick={togglePronunciationGuide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.3 }}
            layout
          >
            <BsVolumeUp />
            <span>{showPronunciationGuide ? "Hide pronunciation guide" : "Show pronunciation guide"}</span>
          </motion.button>
        )}
      </AnimatePresence>
      
      {/* Phonetic pronunciation guide */}
      <AnimatePresence>
        {showPronunciationGuide && metadata?.pronunciation_guide && (
          <motion.div 
            className="phonetic-breakdown"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            layout
          >
            <div className="phonetic-title">Pronunciation Guide:</div>
            <div className="phonetic-full">{metadata.pronunciation_guide}</div>
            
            {phoneticParts.length > 0 && (
              <div className="phonetic-breakdown-parts">
                {phoneticParts.map((part, idx) => (
                  <div key={idx} className={`syllable ${part.primary ? 'primary' : ''}`}>
                    {part.syllable}
                    {part.primary && <div className="stress-indicator">stress</div>}
                  </div>
                ))}
              </div>
            )}
            
            <button 
              onClick={onPlayCorrectPronunciation}
              className="play-pronunciation-btn"
            >
              <BsVolumeUp />
              <span>Listen to Correct Pronunciation</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Word details */}
      <AnimatePresence>
        {showDetails && metadata && (
          <WordMetadata 
            metadata={metadata} 
            onPlayPronunciation={onPlayCorrectPronunciation}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WordDisplay;
