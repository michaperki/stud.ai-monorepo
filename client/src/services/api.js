// src/services/api.js
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

export const fetchNextWord = async (lang = 'iw') => {
  const response = await axios.get(`${API_BASE}/next_word`, {
    params: { lang },
  });
  return response.data;
};

export const checkAnswer = async (word, audioBlob) => {
  if (!word) throw new Error("No word provided to checkAnswer");
  const formData = new FormData();
  formData.append('file', audioBlob);

  const response = await axios.post(`${API_BASE}/check_answer/${encodeURIComponent(word)}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
