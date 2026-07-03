import { AppDispatch } from '@reduxStore/index';
import { getBoundedHookStringContext, logHookFailure } from '@hook/hookDiagnostics';
import { useDispatch } from 'react-redux';

/**
 * Custom hook to safely get the Redux dispatch function
 * Falls back to a no-op function if Redux context is missing
 */
export const useAppDispatch = () => {
  try {
    return useDispatch<AppDispatch>();
  } catch (error) {
    logHookFailure('redux_dispatch_access_failed', error);
    // Return a no-op function that logs errors but doesn't crash
    return ((...args: any) => {
      logHookFailure('redux_dispatch_noop_called', undefined, {
        actionCount: args.length,
        ...getBoundedHookStringContext('firstActionType', args[0]?.type),
      });
      return { type: 'NOOP' };
    }) as AppDispatch;
  }
};
