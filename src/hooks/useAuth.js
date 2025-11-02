// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

// Create and export AuthContext
export const AuthContext = createContext();

// Export the provider
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  
  // ... rest of your AuthProvider logic
  
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// Export the custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};