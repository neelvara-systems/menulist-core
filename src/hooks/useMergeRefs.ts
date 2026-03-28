import React from 'react';

/**
 * A custom hook that merges multiple refs into a single callback ref.
 * This is useful when you need to attach multiple refs to a single component,
 * for example, when using `forwardRef` along with an internal `useRef`.
 *
 * @param refs - An array of refs to be merged.
 * @returns A single callback ref that can be passed to a component's `ref` prop.
 */
export function useMergeRefs<T>(
  refs: Array<React.MutableRefObject<T> | React.LegacyRef<T>>,
): React.RefCallback<T> {
  return React.useCallback(
    (value) => {
      refs.forEach((ref) => {
        if (typeof ref === 'function') {
          ref(value);
        } else if (ref != null) {
          (ref as React.MutableRefObject<T | null>).current = value;
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    refs,
  );
}
