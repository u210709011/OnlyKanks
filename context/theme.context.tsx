import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

interface ThemeColors {
  background: string;
  text: string;
  card: string;
  border: string;
  primary: string;
  error: string;
  input: string;
  inputBackground: string;
  textSecondary: string;
}

export const lightTheme: ThemeColors = {
  background: '#f5f5f5',
  text: '#000000',
  card: '#ffffff',
  border: '#e0e0e0',
  primary: '#007AFF',
  error: '#ff4444',
  input: '#f0f0f0',
  inputBackground: '#e8e8e8',
  textSecondary: '#666666',
};

export const darkTheme: ThemeColors = {
  background: '#121212',
  text: '#ffffff',
  card: '#1e1e1e',
  border: '#2c2c2c',
  primary: '#0A84FF',
  error: '#ff6b6b',
  input: '#2c2c2c',
  inputBackground: '#333333',
  textSecondary: '#b0b0b0',
};

interface ThemeContextType {
  theme: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(colorScheme === 'dark');

  useEffect(() => {
    setIsDark(colorScheme === 'dark');
  }, [colorScheme]);

  const theme = isDark ? darkTheme : lightTheme;

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}; 