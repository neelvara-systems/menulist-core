import { AppDispatch } from '@reduxStore/index';
import { useDispatch } from 'react-redux';

/**
 * Custom hook to safely get the Redux dispatch function
 * Falls back to a no-op function if Redux context is missing
 */
export const useAppDispatch = () => {
  try {
    return useDispatch<AppDispatch>();
  } catch (error) {
    console.error('Error accessing Redux dispatch:', error);
    // Return a no-op function that logs errors but doesn't crash
    return ((...args: any) => {
      console.error('Redux dispatch called without Redux context', args);
      return { type: 'NOOP' };
    }) as AppDispatch;
  }
};
