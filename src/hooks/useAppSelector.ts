import { AppState } from '@reduxStore/index';
import { TypedUseSelectorHook, useSelector } from 'react-redux';

/**
 * Safe type-aware hook for using Redux selectors
 * Falls back to returning a safe default value if Redux context is missing
 * @param selector A function that takes the Redux state and returns a value
 * @param defaultValue Optional default value to return if Redux is unavailable
 */
export function useSafeAppSelector<T>(selector: (state: AppState) => T, defaultValue: T): T {
  try {
    return useSelector<AppState, T>(selector);
  } catch (error) {
    console.error('Error in useSafeAppSelector:', error);
    return defaultValue;
  }
}

/**
 * Traditional type-aware hook for using Redux selectors
 * Will throw an error if Redux context is missing
 */
export const useAppSelector: TypedUseSelectorHook<AppState> = useSelector;
