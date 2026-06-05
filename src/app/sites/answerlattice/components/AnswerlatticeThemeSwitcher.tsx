'use client';

import { LuMonitor, LuMoon, LuSun } from 'react-icons/lu';
import { ANSWERLATTICE_THEME_CHOICES, type AnswerlatticeThemeChoice } from '../theme';
import { useAnswerlatticeTheme } from './AnswerlatticeThemeProvider';

const THEME_LABELS: Record<AnswerlatticeThemeChoice, string> = {
    light: 'Light',
    system: 'System',
    dark: 'Dark',
};

const THEME_ICONS = {
    light: LuSun,
    system: LuMonitor,
    dark: LuMoon,
};

export default function AnswerlatticeThemeSwitcher({ className = '' }: { className?: string }) {
    const { theme, setTheme } = useAnswerlatticeTheme();

    return (
        <div className={`al-theme-switcher ${className}`} role="radiogroup" aria-label="Theme">
            {ANSWERLATTICE_THEME_CHOICES.map((choice) => {
                const Icon = THEME_ICONS[choice];
                const label = THEME_LABELS[choice];
                const isSelected = theme === choice;

                return (
                    <button
                        key={choice}
                        type="button"
                        aria-label={label}
                        aria-checked={isSelected}
                        className="al-theme-switcher__button"
                        data-selected={isSelected ? 'true' : 'false'}
                        onClick={() => setTheme(choice)}
                        role="radio"
                        title={label}
                    >
                        <Icon size={15} aria-hidden />
                    </button>
                );
            })}
        </div>
    );
}
