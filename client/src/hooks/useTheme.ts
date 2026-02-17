import { useState, useEffect } from 'react';

export interface UseThemeReturn {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

function getInitialTheme(): 'dark' | 'light' {
  const stored = localStorage.getItem('theme');
  return stored === 'light' ? 'light' : 'dark';
}

export function useTheme(): UseThemeReturn {
  const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = (): void => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return {
    theme,
    toggleTheme,
  };
}
