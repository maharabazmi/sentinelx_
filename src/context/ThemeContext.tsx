import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light' | 'cyber' | 'system';

interface ThemeContextType {
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
    resolvedTheme: 'dark' | 'light' | 'cyber';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<ThemeMode>(() => {
        const saved = localStorage.getItem('sentinelx_theme');
        if (saved === 'dark' || saved === 'light' || saved === 'cyber' || saved === 'system') {
            return saved as ThemeMode;
        }
        return 'dark';
    });

    const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light' | 'cyber'>('dark');

    useEffect(() => {
        localStorage.setItem('sentinelx_theme', theme);
        const root = document.documentElement;

        const applyTheme = (mode: 'dark' | 'light' | 'cyber') => {
            setResolvedTheme(mode);
            root.classList.remove('dark', 'light');
            root.removeAttribute('data-theme');

            if (mode === 'dark') {
                root.classList.add('dark');
            } else if (mode === 'light') {
                root.classList.add('light');
            } else if (mode === 'cyber') {
                root.setAttribute('data-theme', 'cyber');
                root.classList.add('dark'); // Cyber mode inherits dark variant contrasts
            }
        };

        if (theme === 'system') {
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            applyTheme(systemDark ? 'dark' : 'light');

            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const listener = (e: MediaQueryListEvent) => {
                applyTheme(e.matches ? 'dark' : 'light');
            };
            mediaQuery.addEventListener('change', listener);
            return () => mediaQuery.removeEventListener('change', listener);
        } else {
            applyTheme(theme);
        }
    }, [theme]);

    const setTheme = (newTheme: ThemeMode) => {
        setThemeState(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
