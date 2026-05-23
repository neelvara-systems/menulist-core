'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { LuChevronDown, LuMonitor, LuMoon, LuSun } from 'react-icons/lu';
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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const displayTheme = mounted ? theme : 'system';
  const currentOption = themeOptions.find((option) => option.value === displayTheme) || themeOptions[1];
  const CurrentIcon = currentOption.Icon;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="ws-theme-switcher">
      <button
        type="button"
        className="ws-theme-switcher__trigger"
        aria-label={t('ThemeSwitcher.label')}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(!open)}
      >
        <CurrentIcon size={14} />
        <span>{t(`ThemeSwitcher.${currentOption.key}`)}</span>
        <LuChevronDown size={12} className={open ? 'ws-theme-switcher__chevron is-open' : 'ws-theme-switcher__chevron'} />
      </button>

      {open && (
        <div className="ws-theme-switcher__menu" role="menu" aria-label={t('ThemeSwitcher.label')}>
          {themeOptions.map(({ value, key, Icon }) => {
            const isActive = displayTheme === value;

            return (
              <button
                key={value}
                type="button"
                className={isActive ? 'ws-theme-switcher__option is-active' : 'ws-theme-switcher__option'}
                aria-label={t(`ThemeSwitcher.${key}Aria`)}
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
              >
                <Icon size={14} />
                <span>{t(`ThemeSwitcher.${key}`)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
