/**
 * Analytics Context Provider
 * Centralized state management for analytics dashboard
 * 
 * Benefits:
 * - Single loading/error state across all sections
 * - Prevents multiple spinners
 * - Enables global refresh
 * - Cleaner UX with coordinated states
 */

'use client';

import { notification } from 'antd';
import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';

// ================================================================
// TYPES
// ================================================================

export interface ChatAnalyticsState {
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;
}

export interface ChatAnalyticsContextValue {
  state: ChatAnalyticsState;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  markRefreshed: () => void;
  showError: (message: string, description?: string) => void;
  showSuccess: (message: string, description?: string) => void;
}

// ================================================================
// CONTEXT
// ================================================================

const ChatAnalyticsContext = createContext<ChatAnalyticsContextValue | undefined>(undefined);

// ================================================================
// PROVIDER
// ================================================================

export interface ChatAnalyticsProviderProps {
  children: ReactNode;
}

export const ChatAnalyticsProvider: React.FC<ChatAnalyticsProviderProps> = ({ children }) => {
  const [state, setState] = useState<ChatAnalyticsState>({
    isLoading: false,
    error: null,
    lastRefresh: null,
  });

  // Set loading state
  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, isLoading: loading }));
  }, []);

  // Set error state
  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error, isLoading: false }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Mark as refreshed
  const markRefreshed = useCallback(() => {
    setState((prev) => ({ ...prev, lastRefresh: new Date() }));
  }, []);

  // Show error notification
  const showError = useCallback((message: string, description?: string) => {
    notification.error({
      message,
      description,
      placement: 'topRight',
      duration: 5,
    });
    setError(message);
  }, [setError]);

  // Show success notification
  const showSuccess = useCallback((message: string, description?: string) => {
    notification.success({
      message,
      description,
      placement: 'topRight',
      duration: 3,
    });
    clearError();
  }, [clearError]);

  const value: ChatAnalyticsContextValue = {
    state,
    setLoading,
    setError,
    clearError,
    markRefreshed,
    showError,
    showSuccess,
  };

  return (
    <ChatAnalyticsContext.Provider value={value}>
      {children}
    </ChatAnalyticsContext.Provider>
  );
};

// ================================================================
// HOOK
// ================================================================

/**
 * Use analytics context
 * Provides access to centralized loading/error state
 */
export function useAnalytics(): ChatAnalyticsContextValue {
  const context = useContext(ChatAnalyticsContext);

  if (context === undefined) {
    throw new Error('useAnalytics must be used within ChatAnalyticsProvider');
  }

  return context;
}

// ================================================================
// HELPER HOOK - Async Action Wrapper
// ================================================================

/**
 * Hook to wrap async actions with automatic loading/error handling
 * 
 * Usage:
 * const executeWithState = useAsyncAction();
 * await executeWithState(async () => {
 *   await fetchData();
 * }, 'Loading data...');
 */
export function useAsyncAction() {
  const { setLoading, setError, showError, showSuccess } = useAnalytics();

  return useCallback(
    async <T,>(
      action: () => Promise<T>,
      successMessage?: string,
      errorMessage?: string
    ): Promise<T | null> => {
      try {
        setLoading(true);
        setError(null);

        const result = await action();

        if (successMessage) {
          showSuccess(successMessage);
        }

        return result;
      } catch (error) {
        const message = errorMessage || 'An error occurred while fetching data';
        const description = error instanceof Error ? error.message : 'Unknown error';

        showError(message, description);
        console.error('[Analytics Action Error]:', error);

        return null;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, showError, showSuccess]
  );
}

// ================================================================
// EXPORTS
// ================================================================

export default ChatAnalyticsProvider;
