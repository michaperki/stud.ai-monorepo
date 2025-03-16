// src/contexts/LanguageContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the language context
const LanguageContext = createContext(null);

// Language provider component
export function LanguageProvider({ children, promptLanguage, onChangeLanguage }) {
  // Determine feedback language based on prompt language
  // If prompt is in English, feedback should be in Hebrew and vice versa
  const feedbackLanguage = promptLanguage === 'en' ? 'iw' : 'en';
  
  return (
    <LanguageContext.Provider 
      value={{ 
        promptLanguage, 
        feedbackLanguage,
        onChangeLanguage 
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

// Custom hook to use the language context
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === null) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
