import React, { useEffect, useRef, useState } from "react";

interface Props {
  count: number;
  onClick?: () => void;
  className?: string;
}

function numberOrZero(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

const CartButton = React.forwardRef<HTMLButtonElement, Props>(
  ({ count, onClick, className }, ref) => {
    const [pulse, setPulse] = useState(false);
    const prevCount = useRef(numberOrZero(count));

    useEffect(() => {
      if (count > prevCount.current) {
        setPulse(true);
        const t = setTimeout(() => setPulse(false), 700);
        return () => clearTimeout(t);
      }
      prevCount.current = count;
    }, [count]);

    return (
      <button
        ref={ref}
        type="button"
        aria-label={`Cart with ${count} items`}
        onClick={onClick}
        className={`pm-cart-btn ${pulse ? "pm-cart-pulse" : ""} ${className || ""}`}
        style={{
          display: "inline-grid",
          position: "relative",
          placeItems: "center",
          width: 48,
          height: 48,
          borderRadius: 12,
          background: "rgba(255,255,255,0.92)",
          border: "none",
          cursor: "pointer",
          transition:
            "transform 160ms ease, box-shadow 160ms ease, background 160ms ease",
        }}
      >
        <style>{`
          .pm-cart-btn:active { transform: scale(0.96); }
          .pm-cart-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(8,12,20,0.06); }
          .pm-cart-icon { width: 20px; height: 20px; color: #121212; display: block; }
          .pm-cart-badge { position: absolute; top: -6px; right: -6px; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; background: #f59e0b; color: #111827; font-weight: 800; font-size: 11px; border: 2px solid #ffffff; box-shadow: 0 6px 12px rgba(20,20,20,0.08); transform: translateZ(0); }
          .pm-cart-pulse .pm-cart-icon { animation: pm-pulse 700ms cubic-bezier(0.2,0.8,0.2,1); }
          @keyframes pm-pulse { 0% { transform: scale(1); } 30% { transform: scale(1.18); } 100% { transform: scale(1); } }
        `}</style>

        <svg
          className="pm-cart-icon"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 3h2l1.68 9.39a2 2 0 001.98 1.61h7.68a2 2 0 001.98-1.61L21 6H6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="20" r="1" fill="currentColor" />
          <circle cx="18" cy="20" r="1" fill="currentColor" />
        </svg>

        {count > 0 && (
          <span className="pm-cart-badge" aria-hidden>
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
    );
  },
);

CartButton.displayName = "CartButton";

export default CartButton;