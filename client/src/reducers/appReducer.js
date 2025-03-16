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
    promptLanguage: 'iw', // Hebrew (iw) by default, can also be 'en'
    silenceThreshold: 20,
    silenceDuration: 1500,
    autoPlayTTS: true,
  },
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
      
    case 'SET_RECORDING_STATE':
      return { 
        ...state, 
        recordingState: action.payload 
      };
      
    case 'SET_FEEDBACK':
      // Update hint if feedback contains correct answer and is incorrect
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
        history: [action.payload, ...state.history].slice(0, 20) // Keep latest 20 items
      };
      
    case 'INCREMENT_ATTEMPTS':
      const updatedAttemptCount = state.attemptCount + 1;
      return { 
        ...state, 
        attemptCount: updatedAttemptCount,
        // Update hint based on new attempt count and correct answer
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
      };
      
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
      return {
        ...state,
        stats: {
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
        },
      };
      
    default:
      return state;
  }
}
