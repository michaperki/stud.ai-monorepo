// src/services/api.js
import axios from 'axios';
import { toast } from 'react-hot-toast';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor for global request handling
api.interceptors.request.use(
  (config) => {
    // You could add auth tokens here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for global error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    let errorMessage = 'An unexpected error occurred';
    
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      
      if (status === 401) {
        errorMessage = 'Authentication error. Please log in again.';
      } else if (status === 403) {
        errorMessage = 'You do not have permission to access this resource.';
      } else if (status === 404) {
        errorMessage = 'Resource not found.';
      } else if (status === 429) {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else {
        // Use server provided error message if available
        errorMessage = error.response.data?.detail || error.response.data?.message || errorMessage;
      }
    } else if (error.request) {
      // Request made but no response received
      errorMessage = 'No response from server. Please check your internet connection.';
    }
    
    console.error('API Error:', error);
    toast.error(errorMessage);
    
    return Promise.reject(error);
  }
);

/**
 * Fetch the next word to practice
 * @param {string} lang - Language code ('iw' for Hebrew, 'en' for English)
 * @returns {Promise<Object>} - Word data with audio
 */
export const fetchNextWord = async (lang = 'iw') => {
  try {
    const response = await api.get('/next_word', {
      params: { lang },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Submit a recorded answer to check pronunciation
 * @param {string} word - The word being practiced
 * @param {Blob} audioBlob - The recorded audio blob
 * @returns {Promise<Object>} - Check result with feedback
 */
export const checkAnswer = async (word, audioBlob) => {
  if (!word) throw new Error("No word provided to checkAnswer");
  if (!audioBlob) throw new Error("No audio recording provided");
  
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    
    const response = await api.post(`/check_answer/${encodeURIComponent(word)}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get audio recording settings from the server
 * @returns {Promise<Object>} - Audio recording settings
 */
export const getAudioSettings = async () => {
  try {
    const response = await api.get('/get_audio_settings');
    return response.data;
  } catch (error) {
    console.warn('Failed to fetch audio settings:', error);
    // Return default settings if server request fails
    return {
      silence_threshold: 15,
      silence_duration: 1000,
      min_recording_time: 500,
      max_recording_time: 8000
    };
  }
};

/**
 * Get user statistics
 * @returns {Promise<Object>} - User stats
 */
export const getUserStats = async () => {
  try {
    const response = await api.get('/user_stats');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get list of supported languages
 * @returns {Promise<Array>} - List of language options
 */
export const getSupportedLanguages = async () => {
  try {
    const response = await api.get('/languages');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Save session results
 * @param {Object} sessionData - Session data to save
 * @returns {Promise<Object>} - Session save response
 */
export const saveSession = async (sessionData) => {
  try {
    const response = await api.post('/save_session', sessionData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get pronunciation audio for a specific word
 * @param {string} word - The word to get pronunciation for
 * @param {string} lang - Language code ('iw' for Hebrew, 'en' for English)
 * @returns {Promise<Object>} - Audio data with base64 encoded audio
 */
export const getWordPronunciation = async (word, lang = 'iw') => {
  try {
    const response = await api.get('/get_pronunciation', {
      params: { 
        word,
        lang 
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all available word categories
 * @returns {Promise<Object>} - List of vocabulary categories
 */
export const getVocabularyCategories = async () => {
  try {
    const response = await api.get('/vocabulary/categories');
    return response.data;
  } catch (error) {
    console.warn('Failed to fetch vocabulary categories:', error);
    return { categories: [] };
  }
};

/**
 * Get all available difficulty levels
 * @returns {Promise<Object>} - List of vocabulary difficulty levels
 */
export const getVocabularyDifficultyLevels = async () => {
  try {
    const response = await api.get('/vocabulary/difficulty_levels');
    return response.data;
  } catch (error) {
    console.warn('Failed to fetch vocabulary difficulty levels:', error);
    return { difficulty_levels: [] };
  }
};

/**
 * Get vocabulary words with optional filters
 * @param {Object} filters - Filters to apply
 * @param {string} filters.category - Filter by word category
 * @param {string} filters.difficulty - Filter by difficulty level
 * @param {string} filters.search - Search by Hebrew or English text
 * @param {number} filters.limit - Maximum number of words to return
 * @returns {Promise<Object>} - Filtered vocabulary words
 */
export const getVocabulary = async (filters = {}) => {
  try {
    const response = await api.get('/vocabulary', { params: filters });
    return response.data;
  } catch (error) {
    console.warn('Failed to fetch vocabulary:', error);
    throw error;
  }
};

/**
 * Fetch the next word to practice with enhanced filters
 * @param {string} lang - Language code ('iw' for Hebrew, 'en' for English)
 * @param {Object} options - Additional options
 * @param {string} options.category - Filter by word category
 * @param {string} options.difficulty - Filter by difficulty level
 * @param {Array<string>} options.exclude - Words to exclude
 * @returns {Promise<Object>} - Word data with audio and metadata
 */
export const fetchNextWordEnhanced = async (lang = 'iw', options = {}) => {
  try {
    const params = { 
      lang,
      ...(options.category && { category: options.category }),
      ...(options.difficulty && { difficulty: options.difficulty }),
      ...(options.exclude && { exclude: options.exclude.join(',') })
    };
    
    const response = await api.get('/next_word', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default api;
