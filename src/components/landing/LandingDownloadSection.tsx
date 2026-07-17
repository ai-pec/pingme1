import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

type AppPlatform = "playstore" | "appstore";

const LandingDownloadSection: React.FC = () => {
  const [active, setActive] = useState<AppPlatform | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) return;
    setVisible(true);

    const dismissTimer = setTimeout(() => {
      setVisible(false);
      // Wait for exit animation to complete before clearing active state
      const clearTimer = setTimeout(() => {
        setActive(null);
      }, 300);
      return () => clearTimeout(clearTimer);
    }, 3500);

    return () => clearTimeout(dismissTimer);
  }, [active]);

  const handleClick = (platform: AppPlatform) => {
    // Reset state to force replay of animation if the same button is clicked
    setActive(null);
    setVisible(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setActive(platform);
      });
    });
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
    setTimeout(() => {
      setActive(null);
    }, 300);
  };

  const labels: Record<AppPlatform, string> = {
    playstore: "Google Play Store App",
    appstore: "Apple App Store App",
  };

  return (
    <div className="mx-auto max-w-6xl mt-8 px-4 sm:px-0">
      <div className="bg-white rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center space-y-6 relative overflow-visible border border-border/40">
        <div className="text-center space-y-2 max-w-xl">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest">
            PingME Mobile App
          </p>
          <h3 className="font-extrabold text-2xl md:text-3xl text-foreground">
            Download our App
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage your smart tags, customize QR actions, receive real-time notifications, and protect your privacy on the go.
          </p>
        </div>

        <div className="relative flex flex-col sm:flex-row items-center gap-4 w-full justify-center pt-2">
          {/* Custom Animated Notification Toast in the corner of the page */}
          <AnimatePresence>
            {active && visible && (
              <motion.div
                initial={{ opacity: 0, x: 120, y: 0, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 120, scale: 0.9, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 350, damping: 22 }}
                className="fixed bottom-6 right-6 z-50 pointer-events-auto"
              >
                <div className="relative flex items-center gap-3.5 rounded-2xl border-l-4 border-l-primary border-2 border-border/80 bg-white px-5 py-4 shadow-[0_12px_45px_rgba(81,60,9,0.18)] max-w-sm">
                  {/* Pulsing Dot */}
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                  </span>
                  
                  <div className="flex flex-col pr-6">
                    <span className="text-sm font-bold text-foreground leading-tight">
                      {labels[active]}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground mt-0.5">
                      This mobile app is coming soon! 🚀
                    </span>
                  </div>

                  {/* Close button */}
                  <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-full hover:bg-muted cursor-pointer"
                    aria-label="Close notification"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Play Store Button */}
          <button
            onClick={() => handleClick("playstore")}
            className="group flex items-center gap-3.5 rounded-2xl border-2 border-border/80 bg-background px-6 py-3.5 shadow-sm transition-all duration-300 hover:border-primary hover:shadow-md hover:-translate-y-1 active:scale-95 w-full sm:w-auto justify-center cursor-pointer"
            aria-label="Download from Google Play Store"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 shrink-0 text-foreground transition-colors duration-300 group-hover:text-primary"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M3.18 23.76a1.5 1.5 0 0 0 1.64-.17l11.07-6.39-2.98-2.98-9.73 9.54zM.5 1.05A1.5 1.5 0 0 0 0 2.25v19.5a1.5 1.5 0 0 0 .5 1.2l.07.06 10.93-10.93v-.26L.57.99.5 1.05zM20.3 10.37l-2.96-1.71-3.3 3.3 3.3 3.3 2.98-1.72a1.5 1.5 0 0 0 0-3.17zM4.82.41 15.89 6.8l-2.98 2.98L3.18.24A1.5 1.5 0 0 1 4.82.41z" />
            </svg>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Get it on</span>
              <span className="text-[15px] font-bold text-foreground mt-0.5">Google Play</span>
            </div>
          </button>

          {/* App Store Button */}
          <button
            onClick={() => handleClick("appstore")}
            className="group flex items-center gap-3.5 rounded-2xl border-2 border-border/80 bg-background px-6 py-3.5 shadow-sm transition-all duration-300 hover:border-primary hover:shadow-md hover:-translate-y-1 active:scale-95 w-full sm:w-auto justify-center cursor-pointer"
            aria-label="Download from Apple App Store"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 shrink-0 text-foreground transition-colors duration-300 group-hover:text-primary"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Download on the</span>
              <span className="text-[15px] font-bold text-foreground mt-0.5">App Store</span>
            </div>
          </button>

        </div>
      </div>
      
    </div>
  );
};

export default LandingDownloadSection;
