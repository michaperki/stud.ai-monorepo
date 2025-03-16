// src/contexts/SessionContext.js
import React, { createContext, useContext } from 'react';

// Create the session context
const SessionContext = createContext(null);

// Session provider component
export function SessionProvider({ children, value }) {
  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

// Custom hook to use the session context
export function useSession() {
  const context = useContext(SessionContext);
  if (context === null) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
