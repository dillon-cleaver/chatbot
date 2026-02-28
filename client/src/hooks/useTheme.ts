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

    // Update theme-color meta tag so mobile browser chrome matches
    const color = theme === 'dark' ? '#1f1f1f' : '#ddd7c5';
    let meta = document.querySelector('meta[name="theme-color"]:not([media])') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = color;
  }, [theme]);

  const toggleTheme = (): void => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return {
    theme,
    toggleTheme,
  };
}
