import { useCallback, useEffect, useRef, useState } from 'react';
import { getBoundedHookStringContext, logHookFailure } from '@hook/hookDiagnostics';

const RECENT_COLORS_KEY = 'app_recent_colors';
const FAVORITE_COLORS_KEY = 'app_favorite_colors';
const MAX_RECENT_COLORS = 10;
const MAX_FAVORITE_COLORS = 12;

export interface ColorHistory {
  recentColors: string[];
  favoriteColors: string[];
}

const COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export const normalizeStoredColorList = (value: unknown, maxItems: number): string[] => {
  if (!Array.isArray(value) || !Number.isSafeInteger(maxItems) || maxItems <= 0) return [];
  const seen = new Set<string>();
  const colors: string[] = [];
  for (const candidate of value) {
    if (typeof candidate !== 'string') continue;
    const color = candidate.trim().toLowerCase();
    if (!COLOR_PATTERN.test(color) || seen.has(color)) continue;
    seen.add(color);
    colors.push(color);
    if (colors.length >= maxItems) break;
  }
  return colors;
};

export const parseStoredColorList = (
  value: string | null,
  maxItems: number,
): string[] | null => {
  if (value === null) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? normalizeStoredColorList(parsed, maxItems) : null;
  } catch {
    return null;
  }
};

export const useRecentColors = () => {
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [favoriteColors, setFavoriteColors] = useState<string[]>([]);
  const recentColorsRef = useRef<string[]>([]);
  const favoriteColorsRef = useRef<string[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const loadColors = (
      storageKey: string,
      maxItems: number,
      setColors: (colors: string[]) => void,
      colorsRef: { current: string[] },
    ): void => {
      try {
        const stored = localStorage.getItem(storageKey);
        const colors = parseStoredColorList(stored, maxItems);
        if (colors === null) {
          localStorage.removeItem(storageKey);
          return;
        }
        colorsRef.current = colors;
        setColors(colors);
      } catch (error) {
        logHookFailure('recent_colors_load_failed', error, {
          ...getBoundedHookStringContext('storageKey', storageKey),
        });
      }
    };

    loadColors(RECENT_COLORS_KEY, MAX_RECENT_COLORS, setRecentColors, recentColorsRef);
    loadColors(FAVORITE_COLORS_KEY, MAX_FAVORITE_COLORS, setFavoriteColors, favoriteColorsRef);
  }, []);

  // Add color to recent history
  const addRecentColor = useCallback((color: string) => {
    const normalizedColor = normalizeStoredColorList([color], 1)[0];
    if (!normalizedColor) return;
    const filtered = recentColorsRef.current.filter((c) => c.toLowerCase() !== normalizedColor);
    const updated = [normalizedColor, ...filtered].slice(0, MAX_RECENT_COLORS);
    recentColorsRef.current = updated;
    setRecentColors(updated);
    try {
      localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated));
    } catch (error) {
      logHookFailure('recent_colors_save_failed', error, {
        recentColorCount: updated.length,
        ...getBoundedHookStringContext('color', normalizedColor),
      });
    }
  }, []);

  // Toggle favorite color
  const toggleFavorite = useCallback((color: string) => {
    const normalizedColor = normalizeStoredColorList([color], 1)[0];
    if (!normalizedColor) return;
    const previous = favoriteColorsRef.current;
    let updated: string[];
    if (previous.some((c) => c.toLowerCase() === normalizedColor)) {
      updated = previous.filter((c) => c.toLowerCase() !== normalizedColor);
    } else {
      if (previous.length >= MAX_FAVORITE_COLORS) return;
      updated = [...previous, normalizedColor];
    }
    favoriteColorsRef.current = updated;
    setFavoriteColors(updated);
    try {
      localStorage.setItem(FAVORITE_COLORS_KEY, JSON.stringify(updated));
    } catch (error) {
      logHookFailure('favorite_colors_save_failed', error, {
        favoriteColorCount: updated.length,
        ...getBoundedHookStringContext('color', normalizedColor),
      });
    }
  }, []);

  // Check if color is favorited
  const isFavorite = useCallback((color: string) => {
    const normalizedColor = normalizeStoredColorList([color], 1)[0];
    return Boolean(normalizedColor && favoriteColors.includes(normalizedColor));
  }, [favoriteColors]);

  // Clear recent colors
  const clearRecent = useCallback(() => {
    recentColorsRef.current = [];
    setRecentColors([]);
    try {
      localStorage.removeItem(RECENT_COLORS_KEY);
    } catch (error) {
      logHookFailure('recent_colors_clear_failed', error);
    }
  }, []);

  return {
    recentColors,
    favoriteColors,
    addRecentColor,
    toggleFavorite,
    isFavorite,
    clearRecent,
  };
};
