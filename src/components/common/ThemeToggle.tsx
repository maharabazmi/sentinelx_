import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Sparkles, Monitor, Check, ChevronDown } from 'lucide-react';
import { useTheme, ThemeMode } from '../../context/ThemeContext';

export const ThemeToggle: React.FC = () => {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const options: { id: ThemeMode; label: string; icon: React.ReactNode; badge?: string }[] = [
        {
            id: 'dark',
            label: 'Dark Mode',
            icon: <Moon className="w-4 h-4 text-indigo-400" />,
            badge: 'Obsidian'
        },
        {
            id: 'light',
            label: 'Light Mode',
            icon: <Sun className="w-4 h-4 text-amber-500" />,
            badge: 'Daylight'
        },
        {
            id: 'cyber',
            label: 'Cyber Emerald',
            icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
            badge: 'Tactical'
        },
        {
            id: 'system',
            label: 'System Auto',
            icon: <Monitor className="w-4 h-4 text-slate-400" />,
            badge: 'OS Match'
        }
    ];

    const getActiveIcon = () => {
        switch (theme) {
            case 'light':
                return <Sun className="w-3.5 h-3.5 text-amber-500" />;
            case 'cyber':
                return <Sparkles className="w-3.5 h-3.5 text-emerald-400" />;
            case 'system':
                return <Monitor className="w-3.5 h-3.5 text-slate-400" />;
            case 'dark':
            default:
                return <Moon className="w-3.5 h-3.5 text-indigo-400" />;
        }
    };

    const getActiveLabel = () => {
        switch (theme) {
            case 'light':
                return 'Light';
            case 'cyber':
                return 'Cyber';
            case 'system':
                return 'Auto';
            case 'dark':
            default:
                return 'Dark';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900/90 dark:bg-slate-900 light:bg-slate-100 text-slate-200 light:text-slate-700 border border-slate-700/80 light:border-slate-300 hover:bg-slate-800 light:hover:bg-slate-200 transition shadow-sm"
                title="Change App Theme Mode"
            >
                {getActiveIcon()}
                <span className="hidden sm:inline font-medium">{getActiveLabel()}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-slate-900 light:bg-white border border-slate-700/80 light:border-slate-200 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-2.5 py-1.5 border-b border-slate-800 light:border-slate-100 mb-1">
                        <span className="text-[10px] font-bold text-slate-400 light:text-slate-500 uppercase tracking-wider font-mono">
                            Appearance Theme
                        </span>
                    </div>

                    <div className="space-y-0.5">
                        {options.map((item) => {
                            const isSelected = theme === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setTheme(item.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition ${isSelected
                                            ? 'bg-emerald-500/15 text-emerald-400 light:bg-emerald-50 light:text-emerald-700 font-semibold'
                                            : 'text-slate-300 light:text-slate-700 hover:bg-slate-800/80 light:hover:bg-slate-100'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        {item.badge && (
                                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 light:bg-slate-200 text-slate-400 light:text-slate-600 font-mono font-normal">
                                                {item.badge}
                                            </span>
                                        )}
                                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
