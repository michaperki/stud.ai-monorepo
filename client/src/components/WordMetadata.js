// src/components/WordMetadata.js
import React from 'react';
import { motion } from 'framer-motion';
import { BsTag, BsBarChart, BsVolumeUp, BsQuote } from 'react-icons/bs';

const WordMetadata = ({ metadata, onPlayPronunciation }) => {
  if (!metadata) return null;
  
  const {
    hebrew,
    english,
    category,
    difficulty,
    pronunciation_guide,
    example_sentence = {}
  } = metadata;

  // Format label with proper capitalization
  const formatLabel = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).replace('_', ' ');
  };

  // Define colors for difficulty badges
  const difficultyColors = {
    beginner: '#06d6a0',    // green
    intermediate: '#ffd166', // yellow
    advanced: '#ef476f'      // red
  };

  const difficultyColor = difficultyColors[difficulty] || '#8d99ae';
  
  return (
    <motion.div 
      className="word-metadata"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        marginTop: '1rem',
        padding: '1rem',
        backgroundColor: 'rgba(67, 97, 238, 0.05)',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}
    >
      <div className="metadata-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontWeight: '600' }}>Word Information</h4>
        
        {/* Badges row */}
        <div className="metadata-badges" style={{ display: 'flex', gap: '0.5rem' }}>
          {/* Category badge */}
          {category && (
            <div className="metadata-badge" style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.8rem',
              padding: '0.25rem 0.5rem',
              backgroundColor: 'rgba(67, 97, 238, 0.1)',
              color: '#4361ee',
              borderRadius: '4px'
            }}>
              <BsTag size={12} />
              <span>{formatLabel(category)}</span>
            </div>
          )}
          
          {/* Difficulty badge */}
          {difficulty && (
            <div className="metadata-badge" style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.8rem',
              padding: '0.25rem 0.5rem',
              backgroundColor: `${difficultyColor}20`,
              color: difficultyColor,
              borderRadius: '4px'
            }}>
              <BsBarChart size={12} />
              <span>{formatLabel(difficulty)}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Translation row */}
      <div className="metadata-translation" style={{ 
        display: 'flex', 
        flexDirection: 'column',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        paddingBottom: '0.75rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{hebrew}</div>
          <div style={{ color: '#666', fontSize: '1.1rem' }}>{english}</div>
        </div>
        
        {/* Pronunciation guide */}
        {pronunciation_guide && (
          <div className="pronunciation-guide" style={{ 
            marginTop: '0.5rem', 
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#666',
            fontSize: '0.9rem'
          }}>
            <BsVolumeUp size={14} />
            <span>Pronunciation: <i>{pronunciation_guide}</i></span>
            {onPlayPronunciation && (
              <button 
                onClick={onPlayPronunciation}
                className="play-pronunciation-btn"
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  color: '#4361ee',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <BsVolumeUp size={12} />
                <span>Listen</span>
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Example sentence */}
      {example_sentence && (example_sentence.hebrew || example_sentence.english) && (
        <div className="example-sentence" style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem'
        }}>
          <div className="example-heading" style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem',
            color: '#666',
            fontWeight: '600'
          }}>
            <BsQuote />
            <span>Example</span>
          </div>
          
          {example_sentence.hebrew && (
            <div style={{ fontWeight: '500' }}>{example_sentence.hebrew}</div>
          )}
          
          {example_sentence.english && (
            <div style={{ color: '#666' }}>{example_sentence.english}</div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default WordMetadata;
