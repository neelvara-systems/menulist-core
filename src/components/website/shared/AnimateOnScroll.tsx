"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import { useEffect, useRef, useState } from "react";

type AnimateCSSProperties = CSSProperties & {
  ["--ws-appear-delay"]?: string;
  ["--ws-appear-distance"]?: string;
  ["--ws-appear-duration"]?: string;
  ["--ws-appear-opacity"]?: string;
};

type InViewRef = RefObject<HTMLDivElement | null>;
type RevealMotion = "slide" | "fade";
type RevealPreset = "default" | "hero" | "media" | "card" | "footer" | "fade";
type RevealConfig = {
  distance: number;
  durationMs: number;
  motion: RevealMotion;
  pendingOpacity: number;
};

const REVEAL_DELAY_STEP = 0.09;
const REVEAL_DISTANCE = 12;
const REVEAL_DURATION_MS = 520;
const REVEAL_THRESHOLD = 0.1;
const REVEAL_ROOT_MARGIN = "0px 0px -6% 0px";
const REVEAL_FALLBACK_VP_CHECK_DELAY_MS = 120;
const REVEAL_PRESETS: Record<RevealPreset, RevealConfig> = {
  default: {
    distance: REVEAL_DISTANCE,
    durationMs: REVEAL_DURATION_MS,
    motion: "slide",
    pendingOpacity: 0.88,
  },
  hero: {
    distance: 18,
    durationMs: 720,
    motion: "slide",
    pendingOpacity: 0.78,
  },
  media: {
    distance: 20,
    durationMs: 760,
    motion: "slide",
    pendingOpacity: 0.72,
  },
  card: {
    distance: 16,
    durationMs: 640,
    motion: "slide",
    pendingOpacity: 0.74,
  },
  footer: {
    distance: 18,
    durationMs: 720,
    motion: "slide",
    pendingOpacity: 0.74,
  },
  fade: {
    distance: 0,
    durationMs: REVEAL_DURATION_MS,
    motion: "fade",
    pendingOpacity: 0.74,
  },
};

interface AnimateOnScrollProps {
  children: ReactNode;
  delay?: number;
  distance?: number;
  durationMs?: number;
  pendingOpacity?: number;
  motion?: RevealMotion;
  preset?: RevealPreset;
  className?: string;
  style?: CSSProperties;
}

function resolveRevealConfig({
  distance,
  durationMs,
  motion,
  pendingOpacity,
  preset = "default",
}: Pick<AnimateOnScrollProps, "distance" | "durationMs" | "motion" | "pendingOpacity" | "preset">): RevealConfig {
  const presetConfig = REVEAL_PRESETS[preset];

  return {
    distance: distance ?? presetConfig.distance,
    durationMs: durationMs ?? presetConfig.durationMs,
    motion: motion ?? presetConfig.motion,
    pendingOpacity: pendingOpacity ?? presetConfig.pendingOpacity,
  };
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    updateMotionPreference();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", updateMotionPreference);
      return () => {
        mediaQuery.removeEventListener("change", updateMotionPreference);
      };
    }

    mediaQuery.addListener(updateMotionPreference);
    return () => {
      mediaQuery.removeListener(updateMotionPreference);
    };
  }, []);

  return prefersReducedMotion;
}

function useHasMounted() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return hasMounted;
}

function useInViewReveal(ref: InViewRef, shouldReveal = false) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (shouldReveal) {
      setIsVisible(true);
      return;
    }

    if (typeof window === "undefined" || !window.IntersectionObserver) {
      setIsVisible(true);
      return;
    }

    const currentElement = ref.current;
    if (!currentElement) {
      return;
    }

    const checkInViewport = () => {
      const bounds = currentElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const visibleInViewport = bounds.top < viewportHeight + 24 && bounds.bottom > -24;
      return visibleInViewport;
    };

    if (checkInViewport()) {
      setIsVisible(true);
      return;
    }

    let revealHandled = false;
    let scrollRaf = 0;
    let observer: IntersectionObserver;

    const revealIfVisible = () => {
      if (revealHandled || !checkInViewport()) {
        return;
      }

      revealHandled = true;
      setIsVisible(true);
      observer.disconnect();
      window.removeEventListener("scroll", handleViewportChange);
      window.removeEventListener("resize", handleViewportChange);
    };

    const handleViewportChange = () => {
      if (scrollRaf) {
        return;
      }

      scrollRaf = window.requestAnimationFrame(() => {
        scrollRaf = 0;
        revealIfVisible();
      });
    };

    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          revealHandled = true;
          setIsVisible(true);
          observer.disconnect();
          window.removeEventListener("scroll", handleViewportChange);
          window.removeEventListener("resize", handleViewportChange);
        }
      },
      {
        threshold: REVEAL_THRESHOLD,
        rootMargin: REVEAL_ROOT_MARGIN,
      },
    );

    observer.observe(currentElement);
    window.addEventListener("scroll", handleViewportChange, { passive: true });
    window.addEventListener("resize", handleViewportChange);

    const fallbackTimer = window.setTimeout(() => {
      revealIfVisible();
    }, REVEAL_FALLBACK_VP_CHECK_DELAY_MS);

    return () => {
      revealHandled = true;
      observer.disconnect();
      clearTimeout(fallbackTimer);
      window.removeEventListener("scroll", handleViewportChange);
      window.removeEventListener("resize", handleViewportChange);
      if (scrollRaf) {
        window.cancelAnimationFrame(scrollRaf);
      }
    };
  }, [ref, shouldReveal]);

  return isVisible;
}

export default function AnimateOnScroll({
  children,
  delay = 0,
  distance,
  durationMs,
  pendingOpacity,
  motion,
  preset,
  className,
  style,
}: AnimateOnScrollProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isVisible = useInViewReveal(elementRef, prefersReducedMotion);
  const hasMounted = useHasMounted();
  const isPending = hasMounted && !prefersReducedMotion && !isVisible;

  const wrapperClassName = [
    "ws-animate-on-scroll",
    isPending ? "ws-animate-on-scroll--pending" : "",
    isVisible ? "ws-animate-on-scroll--visible" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const revealConfig = resolveRevealConfig({ distance, durationMs, motion, pendingOpacity, preset });
  const combinedStyle: AnimateCSSProperties = {
    ...style,
    "--ws-appear-delay": `${delay}s`,
    "--ws-appear-distance": revealConfig.motion === "fade" ? "0px" : `${revealConfig.distance}px`,
    "--ws-appear-duration": `${revealConfig.durationMs}ms`,
    "--ws-appear-opacity": `${revealConfig.pendingOpacity}`,
    transitionDuration: `${revealConfig.durationMs}ms`,
    willChange: revealConfig.motion === "fade" ? "opacity" : "opacity, transform",
  };

  return (
    <div ref={elementRef} className={wrapperClassName} style={combinedStyle}>
      {children}
    </div>
  );
}

interface AnimateStaggerChildProps {
  children: ReactNode;
  index?: number;
  distance?: number;
  durationMs?: number;
  pendingOpacity?: number;
  motion?: RevealMotion;
  preset?: RevealPreset;
  className?: string;
  style?: CSSProperties;
}

export function AnimateStaggerChild({
  children,
  index = 0,
  distance,
  durationMs,
  pendingOpacity,
  motion,
  preset,
  className,
  style,
}: AnimateStaggerChildProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const delay = index * REVEAL_DELAY_STEP;
  const prefersReducedMotion = usePrefersReducedMotion();
  const isVisible = useInViewReveal(elementRef, prefersReducedMotion);
  const hasMounted = useHasMounted();
  const isPending = hasMounted && !prefersReducedMotion && !isVisible;

  const wrapperClassName = [
    "ws-animate-on-scroll",
    isPending ? "ws-animate-on-scroll--pending" : "",
    isVisible ? "ws-animate-on-scroll--visible" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const revealConfig = resolveRevealConfig({ distance, durationMs, motion, pendingOpacity, preset });
  const combinedStyle: AnimateCSSProperties = {
    ...style,
    "--ws-appear-delay": `${delay}s`,
    "--ws-appear-distance": revealConfig.motion === "fade" ? "0px" : `${revealConfig.distance}px`,
    "--ws-appear-duration": `${revealConfig.durationMs}ms`,
    "--ws-appear-opacity": `${revealConfig.pendingOpacity}`,
    transitionDuration: `${revealConfig.durationMs}ms`,
    willChange: revealConfig.motion === "fade" ? "opacity" : "opacity, transform",
  };

  return (
    <div ref={elementRef} className={wrapperClassName} style={combinedStyle}>
      {children}
    </div>
  );
}
