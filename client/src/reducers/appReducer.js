// src/reducers/appReducer.js

// Helper function to get hint for a word based on attempt count
export function getHintForWord(englishWord, attemptCount) {
  if (attemptCount < 2) return null;
  if (!englishWord || englishWord.length <= 2) return null;
  
  const first = englishWord[0];
  const last = englishWord[englishWord.length - 1];
  const middle = '_'.repeat(englishWord.length - 2);
  
  return `Hint: ${first}${middle}${last}`;
}

// Load session history from localStorage if available
const loadSessionHistory = () => {
  try {
    const savedHistory = localStorage.getItem('sessionHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  } catch (e) {
    console.error('Error loading session history from localStorage:', e);
    return [];
  }
};

// Initial state
export const initialState = {
  currentWord: '',
  ttsAudio: null,
  loading: false,
  error: null,
  recordingState: 'idle', // idle, recording, recorded
  feedback: null,
  history: [],
  attemptCount: 0,
  lastWord: '',
  hintText: null,
  microphoneError: {
    isOpen: false,
    message: '',
  },
  practiceWithoutMic: false,
  session: {
    active: false,
    paused: false,
    time: 0,
    startTime: null,
    endTime: null,
  },
  stats: {
    totalWords: 0,
    correctWords: 0,
    incorrectAttempts: 0,
  },
  settings: {
    promptLanguage: 'en',
    silenceThreshold: 20,
    silenceDuration: 1500,
    autoPlayTTS: true,
    autoAdvanceDelay: 5,
    wordCategory: '', // New setting for word category
    difficultyLevel: '', // New setting for difficulty level
  },
  wordMetadata: null, // Store metadata for the current word

  // New properties for UI improvements
  enhancedHint: null, // For the new progressive hint system
  theme: 'light', // For theme toggling
  sessionHistory: loadSessionHistory(), // For tracking learning progress - load from localStorage
  categoryStats: {}, // For category-specific statistics
};

// Reducer function
export function appReducer(state, action) {
  switch (action.type) {
    case 'SET_WORD':
      return {
        ...state,
        currentWord: action.payload,
        feedback: null,
        attemptCount: state.lastWord === action.payload ? state.attemptCount : 0,
        lastWord: action.payload,
        hintText: null, // Reset hint when new word is set
      };

    case 'SET_TTS_AUDIO':
      return { 
        ...state, 
        ttsAudio: action.payload 
      };

    case 'SET_LOADING':
      return { 
        ...state, 
        loading: action.payload 
      };

    case 'SET_ERROR':
      return { 
        ...state, 
        error: action.payload 
      };

    case 'SET_MICROPHONE_ERROR':
      return {
        ...state,
        microphoneError: {
          isOpen: action.payload.isOpen,
          message: action.payload.message || state.microphoneError.message,
        }
      };

    case 'SET_PRACTICE_WITHOUT_MIC':
      return {
        ...state,
        practiceWithoutMic: action.payload,
        recordingState: action.payload ? 'idle' : state.recordingState,
      };

    case 'SET_RECORDING_STATE':
      return { 
        ...state, 
        recordingState: action.payload 
      };

    case 'SET_FEEDBACK':
      const newHint = !action.payload.is_correct && action.payload.correct_answer
        ? getHintForWord(action.payload.correct_answer, state.attemptCount + 1)
        : state.hintText;
      return { 
        ...state, 
        feedback: action.payload,
        hintText: newHint
      };

    case 'ADD_HISTORY':
      return { 
        ...state, 
        history: [action.payload, ...state.history].slice(0, 20)
      };

    case 'INCREMENT_ATTEMPTS':
      const updatedAttemptCount = state.attemptCount + 1;
      return { 
        ...state, 
        attemptCount: updatedAttemptCount,
        hintText: state.feedback?.correct_answer
          ? getHintForWord(state.feedback.correct_answer, updatedAttemptCount)
          : state.hintText
      };

    case 'RESET_WORD_STATE':
      return { 
        ...state, 
        feedback: null, 
        recordingState: 'idle',
        attemptCount: 0,
        hintText: null,
        enhancedHint: null,
      };

    case 'SET_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
        },
      };

    case 'START_SESSION':
      return {
        ...state,
        session: {
          ...state.session,
          active: true,
          paused: false,
          time: 0,
          startTime: new Date().toISOString(),
          endTime: null,
        },
        stats: {
          totalWords: 0,
          correctWords: 0,
          incorrectAttempts: 0,
        },
        history: [],
      };

    case 'END_SESSION':
      try {
        const sessionData = {
          date: new Date().toISOString(),
          duration: state.session.time,
          totalWords: state.stats.totalWords,
          incorrectAttempts: state.stats.incorrectAttempts,
          accuracy: state.stats.totalWords + state.stats.incorrectAttempts > 0
            ? Math.round((state.stats.totalWords / (state.stats.totalWords + state.stats.incorrectAttempts)) * 100)
            : 100,
          wordsPerMinute: state.session.time > 60
            ? (state.stats.totalWords / (state.session.time / 60)).toFixed(1)
            : state.stats.totalWords,
        };

        // Update session history in state
        const updatedSessionHistory = [...state.sessionHistory, sessionData];
        
        return {
          ...state,
          session: {
            ...state.session,
            active: false,
            paused: false,
            endTime: new Date().toISOString(),
          },
          currentWord: '',
          ttsAudio: null,
          recordingState: 'idle',
          feedback: null,
          sessionHistory: updatedSessionHistory,
          enhancedHint: null,
        };
      } catch (error) {
        console.error('Error in END_SESSION reducer:', error);
        // Return a safe fallback state even if there's an error
        return {
          ...state,
          session: {
            ...state.session,
            active: false,
            paused: false,
            endTime: new Date().toISOString(),
          },
          currentWord: '',
          ttsAudio: null,
          recordingState: 'idle',
          feedback: null,
          enhancedHint: null,
        };
      }

    case 'PAUSE_SESSION':
      return {
        ...state,
        session: {
          ...state.session,
          paused: true,
        },
      };

    case 'RESUME_SESSION':
      return {
        ...state,
        session: {
          ...state.session,
          paused: false,
        },
      };

    case 'INCREMENT_SESSION_TIME':
      return {
        ...state,
        session: {
          ...state.session,
          time: state.session.time + 1,
        },
      };

    case 'UPDATE_STATS':
      const updatedStats = {
        ...state.stats,
        totalWords: action.payload.isCorrect 
          ? state.stats.totalWords + 1 
          : state.stats.totalWords,
        correctWords: action.payload.isCorrect 
          ? state.stats.correctWords + 1 
          : state.stats.correctWords,
        incorrectAttempts: !action.payload.isCorrect 
          ? state.stats.incorrectAttempts + 1 
          : state.stats.incorrectAttempts,
      };

      let updatedCategoryStats = state.categoryStats;
      if (state.wordMetadata && state.wordMetadata.category) {
        const category = state.wordMetadata.category;
        const currentCatStats = state.categoryStats[category] || {
          total: 0,
          correct: 0,
          mastery: 0,
        };
        updatedCategoryStats = {
          ...state.categoryStats,
          [category]: {
            ...currentCatStats,
            total: currentCatStats.total + 1,
            correct: action.payload.isCorrect 
              ? currentCatStats.correct + 1 
              : currentCatStats.correct,
            mastery: Math.round(
              ((action.payload.isCorrect 
                ? currentCatStats.correct + 1 
                : currentCatStats.correct) / 
                (currentCatStats.total + 1)) * 100
            )
          }
        };
      }
      
      return {
        ...state,
        stats: updatedStats,
        categoryStats: updatedCategoryStats
      };

    case 'UPDATE_FEEDBACK_AUDIO':
      return {
        ...state,
        feedback: {
          ...state.feedback,
          correct_pronunciation_audio: action.payload
        }
      };

    case 'SET_WORD_METADATA':
      return {
        ...state,
        wordMetadata: action.payload
      };

    // New cases for UI improvements
    case 'SET_ENHANCED_HINT':
      return {
        ...state,
        enhancedHint: action.payload
      };

    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload
      };

    case 'ADD_SESSION_HISTORY':
      const newHistory = [...state.sessionHistory, action.payload];
      try {
        localStorage.setItem('sessionHistory', JSON.stringify(newHistory));
      } catch (e) {
        console.error('Error saving session history to localStorage:', e);
      }
      return {
        ...state,
        sessionHistory: newHistory
      };

    case 'SET_SESSION_HISTORY':
      try {
        localStorage.setItem('sessionHistory', JSON.stringify(action.payload));
      } catch (e) {
        console.error('Error saving session history to localStorage:', e);
      }
      return {
        ...state,
        sessionHistory: action.payload
      };

    case 'SET_CATEGORY_STATS':
      return {
        ...state,
        categoryStats: action.payload
      };

    case 'UPDATE_CATEGORY_STATS': {
      const { category, isCorrect } = action.payload;
      if (!category) return state;
      const currentCategoryStats = state.categoryStats[category] || {
        total: 0,
        correct: 0,
        mastery: 0
      };
      const updatedCategoryStats = {
        ...currentCategoryStats,
        total: currentCategoryStats.total + 1,
        correct: isCorrect 
          ? currentCategoryStats.correct + 1 
          : currentCategoryStats.correct,
        mastery: Math.round(
          ((isCorrect 
            ? currentCategoryStats.correct + 1 
            : currentCategoryStats.correct) / 
            (currentCategoryStats.total + 1)) * 100
        )
      };
      return {
        ...state,
        categoryStats: {
          ...state.categoryStats,
          [category]: updatedCategoryStats
        }
      };
    }

    default:
      return state;
  }
}
