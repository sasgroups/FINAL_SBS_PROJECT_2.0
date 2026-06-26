import React, { createContext, useState, useContext, useEffect } from 'react';

// Single theme (myTheme)
const themes = {
  myTheme: {
    name: 'myTheme',
    bg: '#0f172a',
    font: '#ffffff',
    cardBg: '#0f172a',
    border: '#151c29',
    fontnew: '#f1a607'
   
  },
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('myTheme'); // always myTheme

  const changeTheme = (themeName) => {
    if (themes[themeName]) setCurrentTheme(themeName);
  };

  // Apply CSS variables to root element
  useEffect(() => {
    const theme = themes[currentTheme];
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value);
    });
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ theme: themes[currentTheme], currentTheme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};                         