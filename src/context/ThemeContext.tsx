import React, { createContext, useContext, useEffect } from 'react';

// Theme is locked to dark mode. No toggle exposed to users.
export type ThemeMode = 'dark';

interface ThemeContextType {
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
    resolvedTheme: 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('light', 'cyber');
        root.classList.add('dark');
        root.removeAttribute('data-theme');
        localStorage.setItem('sentinelx_theme', 'dark');
    }, []);

    const setTheme = (_: ThemeMode) => {
        // No-op: theme is locked to dark
    };

    return (
        <ThemeContext.Provider value={{ theme: 'dark', setTheme, resolvedTheme: 'dark' }}>
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
