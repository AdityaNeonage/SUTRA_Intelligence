import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";

export interface ScrollRevealOptions {
  once?: boolean;
  rootMargin?: string;
  threshold?: number;
}

/**
 * A small IntersectionObserver wrapper for reveal-on-scroll states. It avoids a
 * motion dependency and immediately resolves for users who prefer reduced motion.
 */
export function useScrollReveal<T extends HTMLElement>({
  once = true,
  rootMargin = "0px 0px -8%",
  threshold = 0.14,
}: ScrollRevealOptions = {}) {
  const ref = useRef<T | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsVisible(true);
      return undefined;
    }

    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return undefined;
    }

    let observer: IntersectionObserver;
    observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsVisible(true);
        if (once) observer.unobserve(entry.target);
      },
      { rootMargin, threshold },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [once, prefersReducedMotion, rootMargin, threshold]);

  return { ref, isVisible };
}
