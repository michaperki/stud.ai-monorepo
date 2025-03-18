// src/utils/hintGenerator.js
/**
 * Generates progressive hints for words based on the number of attempts
 * @param {string} word - The word to generate hints for
 * @param {number} attemptCount - Number of incorrect attempts
 * @param {Object} options - Configuration options
 * @returns {Object} Hint object with text and type
 */
export function generateProgressiveHint(word, attemptCount, options = {}) {
  // Define hint types in order of increasing helpfulness
  const HINT_TYPES = [
    'length',         // Just length hint
    'first_letter',   // First letter revealed
    'partial',        // Some letters revealed
    'phonetic',       // Phonetic hint
    'scrambled',      // Scrambled letters
    'almost_full'     // Most letters revealed
  ];
  
  // Default options
  const defaultOptions = {
    maxHints: HINT_TYPES.length,
    includePhonetic: true,
    includeCategory: true,
    categoryHint: '',
    pronunciationGuide: ''
  };
  
  const settings = { ...defaultOptions, ...options };
  
  // No hint for first attempt or empty/short words
  if (attemptCount < 1 || !word || word.length <= 1) {
    return null;
  }
  
  // Normalize attemptCount to avoid going beyond available hint types
  const normalizedAttemptCount = Math.min(attemptCount, settings.maxHints);
  
  // Get current hint type based on attempt count
  const hintType = HINT_TYPES[normalizedAttemptCount - 1];
  
  // Generate hint based on type
  switch (hintType) {
    case 'length':
      // Just indicate the word length
      return {
        text: `The word has ${word.length} letters`,
        type: 'length'
      };
      
    case 'first_letter':
      // Reveal first letter, mask the rest
      return {
        text: `The word starts with "${word[0]}" and has ${word.length} letters`,
        type: 'first_letter'
      };
      
    case 'partial':
      // Reveal consonants, hide vowels (or vice versa)
      const vowels = ['a', 'e', 'i', 'o', 'u'];
      let partialHint = '';
      
      for (let i = 0; i < word.length; i++) {
        const char = word[i].toLowerCase();
        // If it's a vowel, hide it (or show it and hide consonants for Hebrew)
        if (settings.isHebrew) {
          partialHint += vowels.includes(char) ? char : '_ ';
        } else {
          partialHint += vowels.includes(char) ? '_ ' : char;
        }
      }
      
      return {
        text: `Hint: ${partialHint}`,
        type: 'partial'
      };
      
    case 'phonetic':
      // Provide phonetic pronunciation if available
      if (settings.includePhonetic && settings.pronunciationGuide) {
        return {
          text: `Pronunciation: "${settings.pronunciationGuide}"`,
          type: 'phonetic'
        };
      }
      // Fallback to category hint if phonetic not available
      else if (settings.includeCategory && settings.categoryHint) {
        return {
          text: `Category: ${settings.categoryHint}`,
          type: 'category'
        };
      }
      // Otherwise, scramble the letters
      else {
        const scrambled = word.split('')
          .sort(() => Math.random() - 0.5)
          .join(' ');
        
        return {
          text: `Scrambled letters: ${scrambled}`,
          type: 'scrambled'
        };
      }
      
    case 'scrambled':
      // Scramble the letters
      const scrambled = word.split('')
        .sort(() => Math.random() - 0.5)
        .join(' ');
        
      return {
        text: `Scrambled letters: ${scrambled}`,
        type: 'scrambled'
      };
      
    case 'almost_full':
      // Reveal most letters, hide a few
      let almostFullHint = '';
      const hiddenIndices = [];
      
      // Hide ~25% of letters at random positions
      const hiddenCount = Math.max(1, Math.floor(word.length * 0.25));
      
      while (hiddenIndices.length < hiddenCount) {
        const idx = Math.floor(Math.random() * word.length);
        if (!hiddenIndices.includes(idx)) {
          hiddenIndices.push(idx);
        }
      }
      
      for (let i = 0; i < word.length; i++) {
        almostFullHint += hiddenIndices.includes(i) ? '_ ' : word[i];
      }
      
      return {
        text: `Almost there: ${almostFullHint}`,
        type: 'almost_full'
      };
      
    default:
      // Fallback to simple first/last letter hint
      const first = word[0];
      const last = word[word.length - 1];
      const middle = '_ '.repeat(word.length - 2);
      
      return {
        text: `Hint: ${first}${middle}${last}`,
        type: 'default'
      };
  }
}

/**
 * Create a styled hint element with icon based on hint type
 * @param {Object} hint - The hint object from generateProgressiveHint
 * @returns {JSX.Element} Styled hint element with appropriate icon
 */
export function renderHint(hint) {
  if (!hint) return null;
  
  // Import these in your component
  // import { BsLightbulb, BsVolumeUp, BsPuzzle, BsType } from 'react-icons/bs';
  
  const getHintIcon = (type) => {
    switch (type) {
      case 'phonetic':
        return '<BsVolumeUp size={16} />';
      case 'scrambled':
        return '<BsPuzzle size={16} />';
      case 'length':
        return '<BsType size={16} />';
      default:
        return '<BsLightbulb size={16} />';
    }
  };
  
  const iconElement = getHintIcon(hint.type);
  
  return `
    <div className="hint-container ${hint.type}">
      <div className="hint-icon">
        ${iconElement}
      </div>
      <div className="hint-text">
        ${hint.text}
      </div>
    </div>
  `;
}

// Integration with appReducer.js
// Replace the current getHintForWord function with:

export function getHintForWord(word, attemptCount, metadata = null) {
  if (attemptCount < 1) return null;
  
  const options = {
    maxHints: 5,
    includePhonetic: true,
    includeCategory: true,
    isHebrew: metadata?.hebrew === word,
    categoryHint: metadata?.category,
    pronunciationGuide: metadata?.pronunciation_guide
  };
  
  return generateProgressiveHint(word, attemptCount, options);
}
