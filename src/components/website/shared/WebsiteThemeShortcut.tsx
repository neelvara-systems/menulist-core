'use client';

import { useEffect, type ReactNode } from 'react';
import { useTheme } from '../shadcn/theme-provider';

function isInputTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  const isTextInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
  const isEditable = target.getAttribute('contenteditable') === 'true';
  return isTextInput || isEditable;
}

export default function WebsiteThemeShortcut(): ReactNode {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isShortcutPressed = event.shiftKey && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd';

      if (!isShortcutPressed) {
        return;
      }

      if (isInputTarget(event.target)) {
        return;
      }

      const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'light' : getSystemContrastTheme();
      setTheme(nextTheme);
      event.preventDefault();
    }

    function getSystemContrastTheme() {
      if (typeof window === 'undefined') {
        return 'dark';
      }

      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark';
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [theme, setTheme]);

  return null;
}
