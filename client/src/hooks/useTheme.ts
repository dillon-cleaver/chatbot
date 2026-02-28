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

    // Update all theme-color meta tags so mobile browser chrome matches.
    // The static media-query tags in index.html handle the initial load;
    // once React mounts we override them all to match the active theme
    // (which may differ from the OS preference via localStorage).
    const color = theme === 'dark' ? '#1f1f1f' : '#ddd7c5';
    const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
    metas.forEach((m) => { m.content = color; });
  }, [theme]);

  const toggleTheme = (): void => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return {
    theme,
    toggleTheme,
  };
}
