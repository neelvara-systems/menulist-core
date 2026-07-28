import { useCallback, useEffect, useState } from 'react';
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

export const useRecentColors = () => {
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [favoriteColors, setFavoriteColors] = useState<string[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedRecent = localStorage.getItem(RECENT_COLORS_KEY);
      const savedFavorites = localStorage.getItem(FAVORITE_COLORS_KEY);

      if (savedRecent) {
        setRecentColors(normalizeStoredColorList(JSON.parse(savedRecent), MAX_RECENT_COLORS));
      }
      if (savedFavorites) {
        setFavoriteColors(normalizeStoredColorList(JSON.parse(savedFavorites), MAX_FAVORITE_COLORS));
      }
    } catch (error) {
      logHookFailure('recent_colors_load_failed', error, {
        storageKeyCount: 2,
      });
    }
  }, []);

  // Add color to recent history
  const addRecentColor = useCallback((color: string) => {
    const normalizedColor = normalizeStoredColorList([color], 1)[0];
    if (!normalizedColor) return;
    setRecentColors((prev) => {
      // Remove if already exists
      const filtered = prev.filter((c) => c.toLowerCase() !== normalizedColor);
      // Add to beginning
      const updated = [normalizedColor, ...filtered].slice(0, MAX_RECENT_COLORS);
      
      // Save to localStorage
      try {
        localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated));
      } catch (error) {
        logHookFailure('recent_colors_save_failed', error, {
          recentColorCount: updated.length,
          ...getBoundedHookStringContext('color', normalizedColor),
        });
      }
      
      return updated;
    });
  }, []);

  // Toggle favorite color
  const toggleFavorite = useCallback((color: string) => {
    const normalizedColor = normalizeStoredColorList([color], 1)[0];
    if (!normalizedColor) return;
    setFavoriteColors((prev) => {
      let updated: string[];
      
      if (prev.some((c) => c.toLowerCase() === normalizedColor)) {
        // Remove from favorites
        updated = prev.filter((c) => c.toLowerCase() !== normalizedColor);
      } else {
        // Add to favorites (if under limit)
        if (prev.length >= MAX_FAVORITE_COLORS) {
          return prev; // Don't add if at max
        }
        updated = [...prev, normalizedColor];
      }
      
      // Save to localStorage
      try {
        localStorage.setItem(FAVORITE_COLORS_KEY, JSON.stringify(updated));
      } catch (error) {
        logHookFailure('favorite_colors_save_failed', error, {
          favoriteColorCount: updated.length,
          ...getBoundedHookStringContext('color', normalizedColor),
        });
      }
      
      return updated;
    });
  }, []);

  // Check if color is favorited
  const isFavorite = useCallback((color: string) => {
    const normalizedColor = normalizeStoredColorList([color], 1)[0];
    return Boolean(normalizedColor && favoriteColors.includes(normalizedColor));
  }, [favoriteColors]);

  // Clear recent colors
  const clearRecent = useCallback(() => {
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
