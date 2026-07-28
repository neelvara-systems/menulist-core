import { AppDispatch } from '@reduxStore/index';
import { useDispatch } from 'react-redux';

/**
 * Typed Redux dispatch hook. A missing Provider is a configuration error and
 * must remain visible instead of silently dropping state transitions.
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
