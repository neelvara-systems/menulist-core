
"use client";

import type { RefObject} from 'react';
import { useState, useEffect, useRef } from 'react';

interface UseInViewOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  triggerOnce?: boolean;
}

export function useInView<T extends Element>(
  options: UseInViewOptions = {}
): [RefObject<T | null>, boolean] {
  const { root = null, rootMargin = '0px', threshold = 0.1, triggerOnce = true } = options;
  const ref = useRef<T>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false); // To ensure triggerOnce works

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (triggerOnce) {
            if (!hasTriggered) {
              setIsInView(true);
              setHasTriggered(true);
              // Stop observing after the element has been seen once
              if (ref.current) {
                observer.unobserve(ref.current);
              }
            }
          } else {
            setIsInView(true);
          }
        } else {
          if (!triggerOnce) {
            setIsInView(false);
          }
        }
      },
      {
        root,
        rootMargin,
        threshold,
      }
    );

    const currentElement = ref.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
      // Disconnect the observer when the component unmounts
      observer.disconnect();
    };
  }, [ref, root, rootMargin, threshold, triggerOnce, hasTriggered]);

  return [ref, isInView];
}
