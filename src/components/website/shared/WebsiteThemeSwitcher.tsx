'use client';

import { useTranslations } from 'next-intl';
import { LuMonitor, LuMoon, LuSun } from 'react-icons/lu';
import { useTheme } from '../shadcn/theme-provider';

const themeOptions = [
  { value: 'light', key: 'light', Icon: LuSun },
  { value: 'system', key: 'system', Icon: LuMonitor },
  { value: 'dark', key: 'dark', Icon: LuMoon },
] as const;

export default function WebsiteThemeSwitcher() {
  const t = useTranslations('Website');
  const { theme, setTheme } = useTheme();

  return (
    <div className="ws-theme-switcher" role="group" aria-label={t('ThemeSwitcher.label')}>
      {themeOptions.map(({ value, key, Icon }) => {
        const isActive = theme === value;

        return (
          <button
            key={value}
            type="button"
            className="ws-theme-switcher__button"
            aria-pressed={isActive}
            aria-label={t(`ThemeSwitcher.${key}Aria`)}
            onClick={() => setTheme(value)}
          >
            <Icon size={14} />
            <span>{t(`ThemeSwitcher.${key}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
