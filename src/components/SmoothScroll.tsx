import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Lenis from "lenis";

// Expose lenis instance globally so pages can trigger scroll-to-top after mount
declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

const SmoothScroll: React.FC = () => {
  const { pathname } = useLocation();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const prefersReduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowCore = typeof navigator !== "undefined" && typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency < 3;

    if (prefersReduced || lowCore) {
      return;
    }

    const lenis = new Lenis({
      duration: 0.9,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.0,
      infinite: false,
      prevent: (node) =>
        node instanceof HTMLElement && Boolean(node.closest("[data-lenis-prevent]")),
    });

    lenisRef.current = lenis;
    window.__lenis = lenis;

    let rafId: number;
    function raf(time: number) {
      if (document.visibilityState === "visible") {
        lenis.raf(time);
      }
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    return () => {
      try { lenis.destroy(); } catch (_) {}
      cancelAnimationFrame(rafId);
      lenisRef.current = null;
      window.__lenis = undefined;
    };
  }, []);

  useEffect(() => {
    // Immediately stop any in-progress scroll and jump to top on route change.
    // Pages that are lazy-loaded should call scrollToTop() after their own mount.
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
};

export const scrollToTop = () => {
  if (window.__lenis) {
    window.__lenis.scrollTo(0, { immediate: true });
  } else {
    window.scrollTo(0, 0);
  }
};

export default SmoothScroll;
