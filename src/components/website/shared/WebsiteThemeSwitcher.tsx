'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
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
  const [mounted, setMounted] = useState(false);
  const displayTheme = mounted ? theme : 'system';

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="ws-theme-switcher" role="radiogroup" aria-label={t('ThemeSwitcher.label')}>
      {themeOptions.map(({ value, key, Icon }) => {
        const isActive = displayTheme === value;

        return (
          <button
            key={value}
            type="button"
            className={isActive ? 'ws-theme-switcher__segment is-active' : 'ws-theme-switcher__segment'}
            aria-label={t(`ThemeSwitcher.${key}Aria`)}
            aria-checked={isActive}
            role="radio"
            title={t(`ThemeSwitcher.${key}`)}
            onClick={() => setTheme(value)}
          >
            <Icon size={17} />
          </button>
        );
      })}
    </div>
  );
}
