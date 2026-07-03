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

export const useRecentColors = () => {
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [favoriteColors, setFavoriteColors] = useState<string[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedRecent = localStorage.getItem(RECENT_COLORS_KEY);
      const savedFavorites = localStorage.getItem(FAVORITE_COLORS_KEY);

      if (savedRecent) {
        setRecentColors(JSON.parse(savedRecent));
      }
      if (savedFavorites) {
        setFavoriteColors(JSON.parse(savedFavorites));
      }
    } catch (error) {
      logHookFailure('recent_colors_load_failed', error, {
        storageKeyCount: 2,
      });
    }
  }, []);

  // Add color to recent history
  const addRecentColor = useCallback((color: string) => {
    setRecentColors((prev) => {
      // Remove if already exists
      const filtered = prev.filter((c) => c.toLowerCase() !== color.toLowerCase());
      // Add to beginning
      const updated = [color, ...filtered].slice(0, MAX_RECENT_COLORS);
      
      // Save to localStorage
      try {
        localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated));
      } catch (error) {
        logHookFailure('recent_colors_save_failed', error, {
          recentColorCount: updated.length,
          ...getBoundedHookStringContext('color', color),
        });
      }
      
      return updated;
    });
  }, []);

  // Toggle favorite color
  const toggleFavorite = useCallback((color: string) => {
    setFavoriteColors((prev) => {
      let updated: string[];
      
      if (prev.some((c) => c.toLowerCase() === color.toLowerCase())) {
        // Remove from favorites
        updated = prev.filter((c) => c.toLowerCase() !== color.toLowerCase());
      } else {
        // Add to favorites (if under limit)
        if (prev.length >= MAX_FAVORITE_COLORS) {
          return prev; // Don't add if at max
        }
        updated = [...prev, color];
      }
      
      // Save to localStorage
      try {
        localStorage.setItem(FAVORITE_COLORS_KEY, JSON.stringify(updated));
      } catch (error) {
        logHookFailure('favorite_colors_save_failed', error, {
          favoriteColorCount: updated.length,
          ...getBoundedHookStringContext('color', color),
        });
      }
      
      return updated;
    });
  }, []);

  // Check if color is favorited
  const isFavorite = useCallback((color: string) => {
    return favoriteColors.some((c) => c.toLowerCase() === color.toLowerCase());
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
