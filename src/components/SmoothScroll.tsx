import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Lenis from "lenis";

const SmoothScroll: React.FC = () => {
  const { pathname } = useLocation();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Respect reduced-motion and low-powered devices: skip Lenis if user prefers reduced motion
    const prefersReduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowCore = typeof navigator !== "undefined" && typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency < 3;

    if (prefersReduced || lowCore) {
      // Do not init smooth-scrolling on low-end devices or when user requests reduced motion
      return;
    }

    // Initialize Lenis for smooth kinetic/momentum scrolling
    const lenis = new Lenis({
      duration: 0.9, // shorter duration is snappier and less likely to feel laggy
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.0,
      infinite: false,
    });

    lenisRef.current = lenis;

    let rafId: number;
    function raf(time: number) {
      // Only call lenis.raf when the document is visible to avoid wasted work
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
    };
  }, []);

  useEffect(() => {
    // Instantly scroll to top of page when route/pathname changes
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
};

export default SmoothScroll;
