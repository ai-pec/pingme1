import { useEffect, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Review = {
  name: string;
  location: string;
  vehicle: string;
  text: string;
  rating: number;
  tag: string;
  initials: string;
  avatarColor: string;
};

// ─── Data ────────────────────────────────────────────────────────────────────

const reviews: Review[] = [
  {
    name: "Rohit Sharma",
    location: "Sector 22, Chandigarh",
    vehicle: "Car owner",
    text: "Mere building ke neeche parking mein koi baar baar notice chhodta tha. Ab scan karo, message aao, main nikal deta hoon. No awkward calls, no sharing number with random strangers.",
    rating: 5,
    tag: "Apartment parking",
    initials: "RS",
    avatarColor: "#92400E",
  },
  {
    name: "Priya Nair",
    location: "HSR Layout, Bengaluru",
    vehicle: "Scooty owner",
    text: "As a woman, sharing my number with unknown people near my vehicle always felt unsafe. PingME completely solved that. Whoever scans gets to alert me — without ever seeing my actual number.",
    rating: 5,
    tag: "Safety-first",
    initials: "PN",
    avatarColor: "#78350F",
  },
  {
    name: "Gurpreet Singh",
    location: "Mohali, Punjab",
    vehicle: "SUV owner",
    text: "Costco jaisa experience chahiye tha mujhe. One tap and the person outside knows I'll move my car in 5 minutes. Already recommended it to 4 friends in my society.",
    rating: 5,
    tag: "Society parking",
    initials: "GS",
    avatarColor: "#451A03",
  },
  {
    name: "Ananya Krishnan",
    location: "Koramangala, Bengaluru",
    vehicle: "Car owner",
    text: "Got a ping that my car was blocking a delivery truck. Moved it in 2 minutes. Without this, the truck would've waited 40 mins for office hours to end. Absolute lifesaver.",
    rating: 5,
    tag: "Quick response",
    initials: "AK",
    avatarColor: "#92400E",
  },
  {
    name: "Mohammed Rafi",
    location: "Hyderabad Old City",
    vehicle: "Bike owner",
    text: "Main market area mein park karta hoon. Pehle toh log honk karte rehte the aur maine kuch nahi sunta tha. Ab seedha message aata hai — zero noise, zero stress.",
    rating: 5,
    tag: "Market parking",
    initials: "MR",
    avatarColor: "#78350F",
  },
  {
    name: "Sunita Mehra",
    location: "Burail, Chandigarh",
    vehicle: "Car owner",
    text: "My husband travels a lot. When I park outside the school, someone always needed me to shift. Now they just scan and ping me. I feel so much safer not giving my number to everyone.",
    rating: 5,
    tag: "School pickup",
    initials: "SM",
    avatarColor: "#451A03",
  },
  {
    name: "Arjun Kapoor",
    location: "Noida Sector 50",
    vehicle: "Car owner",
    text: "Office mein visitor parking mein zyada ruk jata tha. Security wale khud scan karke alert karte hain ab. Company ne 15 PingME cards bulk mein order kiye hain ab.",
    rating: 5,
    tag: "Office fleet",
    initials: "AK",
    avatarColor: "#92400E",
  },
  {
    name: "Deepa Venkataraman",
    location: "T. Nagar, Chennai",
    vehicle: "Hatchback owner",
    text: "Enna solrathu — it just works. Downloaded it for my husband when he started driving to work. Now our whole neighbourhood WhatsApp group is talking about it.",
    rating: 5,
    tag: "Neighbourhood hit",
    initials: "DV",
    avatarColor: "#78350F",
  },
  {
    name: "Kabir Malhotra",
    location: "Panchkula, Haryana",
    vehicle: "Car owner",
    text: "My car headlight was left on all night. A neighbour scanned my PingME tag at 11pm and sent an alert. Saved my battery. That one incident alone was worth every rupee.",
    rating: 5,
    tag: "Emergency alert",
    initials: "KM",
    avatarColor: "#451A03",
  },
  {
    name: "Ritika Joshi",
    location: "Baner, Pune",
    vehicle: "Two-wheeler owner",
    text: "Setup liya 10 minutes mein. Sticker ek dum clean lagta hai bike pe. Log impress ho jaate hain when they scan it — already three of my colleagues got one too.",
    rating: 5,
    tag: "Quick setup",
    initials: "RJ",
    avatarColor: "#92400E",
  },
  {
    name: "Vijay Rangan",
    location: "Anna Nagar, Chennai",
    vehicle: "Car owner",
    text: "I drive a white Alto. You'd think nobody would notice. But parking trouble is real even for small cars. Now I just hang the card and relax. No fights, no drama.",
    rating: 5,
    tag: "Stress-free",
    initials: "VR",
    avatarColor: "#78350F",
  },
  {
    name: "Neha Bansal",
    location: "Zirakpur, Punjab",
    vehicle: "SUV owner",
    text: "Maternity leave pe hoon, bahar nahi ja sakti jaldi. Someone pinged that I was blocking their driveway. Moved it in 90 seconds from inside the house. Parents too should get this.",
    rating: 5,
    tag: "New parent must",
    initials: "NB",
    avatarColor: "#451A03",
  },
];

const half = Math.ceil(reviews.length / 2);
const row1 = reviews.slice(0, half);
const row2 = reviews.slice(half);

// ─── Sub-components ──────────────────────────────────────────────────────────

const StarRating = ({ rating }: { rating: number }) => (
  <div style={{ display: "flex", gap: "3px" }}>
    {Array.from({ length: 5 }).map((_, i) => (
      <svg
        key={i}
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill={i < rating ? "#F4B400" : "none"}
        stroke={i < rating ? "#F4B400" : "#D1B87A"}
        strokeWidth="1.5"
      >
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
    ))}
  </div>
);

const Avatar = ({ initials, color }: { initials: string; color: string }) => (
  <div
    style={{
      width: "38px",
      height: "38px",
      borderRadius: "50%",
      backgroundColor: color,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      fontSize: "12px",
      fontWeight: 700,
      color: "#FEF3C7",
      letterSpacing: "0.04em",
      fontFamily: "'Poppins', sans-serif",
      border: "2px solid rgba(244,180,0,0.25)",
    }}
  >
    {initials}
  </div>
);

// PingME-branded quote icon using the brand yellow
const QuoteIcon = () => (
  <svg
    width="24"
    height="18"
    viewBox="0 0 24 18"
    fill="none"
    style={{ flexShrink: 0 }}
  >
    <path
      d="M0 18V11.1C0 9.3.405 7.575 1.215 5.925 2.025 4.275 3.195 2.85 4.725 1.65 6.285.45 8.145.03 10.305 0l.63 1.8C9.135 2.28 7.8 3.12 6.9 4.32c-.96 1.17-1.44 2.52-1.44 4.05H8.1V18H0zM13.5 18V11.1c0-1.8.405-3.525 1.215-5.175.81-1.65 1.98-3.075 3.51-4.275C19.785.45 21.645.03 23.805 0l.63 1.8c-2.07.48-3.435 1.32-4.335 2.52-.96 1.17-1.44 2.52-1.44 4.05H21.6V18H13.5z"
      fill="#F4B400"
      opacity="0.25"
    />
  </svg>
);

// Hazard-stripe accent bar — matches brand's hazard-stripe pattern
const HazardAccent = () => (
  <div
    style={{
      width: "36px",
      height: "4px",
      borderRadius: "2px",
      background:
        "repeating-linear-gradient(-45deg, #F4B400, #F4B400 4px, #1C1007 4px, #1C1007 8px)",
    }}
  />
);

const ReviewCard = ({ review }: { review: Review }) => (
  <article
    className="pm-review-card"
    style={{
      flexShrink: 0,
      width: "320px",
      borderRadius: "16px",
      background: "hsl(var(--card))",
      border: "1.5px solid hsl(var(--border))",
      padding: "22px 22px 18px",
      display: "flex",
      flexDirection: "column",
      gap: "14px",
      cursor: "default",
      boxShadow: "0 2px 16px rgba(81,60,9,0.07)",
      transition:
        "transform 0.32s cubic-bezier(0.22,1,0.36,1), box-shadow 0.32s ease",
      position: "relative",
      overflow: "hidden",
    }}
  >
    {/* Subtle yellow top-edge accent */}
    <div
      style={{
        position: "absolute",
        top: 0,
        left: "24px",
        right: "24px",
        height: "2px",
        borderRadius: "0 0 2px 2px",
        background:
          "linear-gradient(90deg, transparent, #F4B400 30%, #F4B400 70%, transparent)",
        opacity: 0.5,
      }}
    />

    {/* Top row: quote icon + stars */}
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}
    >
      <QuoteIcon />
      <StarRating rating={review.rating} />
    </div>

    {/* Review text */}
    <p
      style={{
        fontSize: "13.5px",
        lineHeight: "1.8",
        color: "hsl(var(--foreground))",
        margin: 0,
        flex: 1,
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 400,
        letterSpacing: "-0.003em",
      }}
    >
      {review.text}
    </p>

    {/* Tag pill — yellow brand colour */}
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 10px 3px 8px",
        borderRadius: "99px",
        background: "hsl(var(--ping-card))",
        color: "hsl(var(--ping-brown))",
        border: "1px solid hsl(var(--border))",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.015em",
        alignSelf: "flex-start",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: "#F4B400",
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      {review.tag}
    </span>

    {/* Footer */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        paddingTop: "12px",
        borderTop: "1px solid hsl(var(--border))",
      }}
    >
      <Avatar initials={review.initials} color={review.avatarColor} />
      <div>
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            fontWeight: 700,
            color: "hsl(var(--foreground))",
            fontFamily: "'Poppins', sans-serif",
            letterSpacing: "-0.01em",
          }}
        >
          {review.name}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "11px",
            color: "hsl(var(--muted-foreground))",
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          {review.location} · {review.vehicle}
        </p>
      </div>
    </div>
  </article>
);

// ─── Marquee hook ─────────────────────────────────────────────────────────────

const useMarquee = (
  rowRef: React.RefObject<HTMLDivElement>,
  direction: "left" | "right",
  speed: number
) => {
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    let pos = direction === "right" ? -(el.scrollWidth / 3) : 0;
    let animId: number;
    let paused = false;

    const step = () => {
      if (!paused) {
        const delta = direction === "left" ? -speed : speed;
        pos += delta / 60;
        const third = el.scrollWidth / 3;
        if (direction === "left" && pos <= -third) pos += third;
        if (direction === "right" && pos >= 0) pos -= third;
        el.style.transform = `translateX(${pos}px)`;
      }
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);

    const pause = () => { paused = true; };
    const resume = () => { paused = false; };

    el.parentElement?.addEventListener("mouseenter", pause);
    el.parentElement?.addEventListener("mouseleave", resume);

    return () => {
      cancelAnimationFrame(animId);
      el.parentElement?.removeEventListener("mouseenter", pause);
      el.parentElement?.removeEventListener("mouseleave", resume);
    };
  }, [rowRef, direction, speed]);
};

const MarqueeRow = ({
  items,
  direction = "left",
  speed = 40,
}: {
  items: Review[];
  direction?: "left" | "right";
  speed?: number;
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  useMarquee(rowRef, direction, speed);
  const looped = [...items, ...items, ...items];

  return (
    <div style={{ overflow: "hidden", width: "100%", padding: "4px 0" }} aria-hidden="true">
      <div
        ref={rowRef}
        style={{ display: "flex", gap: "16px", width: "max-content", willChange: "transform" }}
      >
        {looped.map((review, idx) => (
          <ReviewCard key={`${review.name}-${idx}`} review={review} />
        ))}
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const LandingReviews = () => {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');

        .pm-reviews-section {
          position: relative;
          overflow: hidden;
          padding: 88px 0 72px;
          /* matches body background from global CSS */
          background:
            radial-gradient(circle at 15% 10%, rgba(255,231,170,0.35), transparent 50%),
            radial-gradient(circle at 85% 5%, rgba(255,248,226,0.4), transparent 45%),
            hsl(0 0% 100%);
        }

        .dark .pm-reviews-section {
          background: hsl(0 0% 5%);
        }

        /* Fade overlays use cream background to match site */
        .pm-fade-left {
          position: absolute; left: 0; top: 0; bottom: 0; width: 140px;
          background: linear-gradient(to right,
            hsl(42 100% 96%),
            transparent
          );
          z-index: 2; pointer-events: none;
        }
        .pm-fade-right {
          position: absolute; right: 0; top: 0; bottom: 0; width: 140px;
          background: linear-gradient(to left,
            hsl(42 100% 96%),
            transparent
          );
          z-index: 2; pointer-events: none;
        }

        .dark .pm-fade-left  { background: linear-gradient(to right,  hsl(0 0% 5%), transparent); }
        .dark .pm-fade-right { background: linear-gradient(to left, hsl(0 0% 5%), transparent); }

        /* Card hover */
        .pm-review-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 18px 44px rgba(81,60,9,0.14) !important;
        }
        .dark .pm-review-card:hover {
          box-shadow: 0 18px 44px rgba(0,0,0,0.5) !important;
        }

        /* Rating badge */
        .pm-rating-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 16px; border-radius: 99px;
          background: hsl(45 100% 92%);
          color: hsl(30 75% 26%);
          font-size: 13px; font-weight: 700;
          font-family: 'Poppins', sans-serif;
          letter-spacing: -0.01em;
          border: 1.5px solid hsl(45 100% 80%);
        }
        .dark .pm-rating-badge {
          background: #422006; color: #FDE68A;
          border-color: #92400E;
        }

        /* CTA button — matching .alert-button style */
        .pm-cta-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 28px; border-radius: 12px;
          background: hsl(45 100% 48%);
          color: hsl(40 76% 7%);
          font-size: 14px; font-weight: 700;
          font-family: 'Poppins', sans-serif;
          letter-spacing: -0.01em;
          text-decoration: none;
          border: none; cursor: pointer;
          box-shadow: 0 4px 16px rgba(244,180,0,0.35);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .pm-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(244,180,0,0.45);
        }

        /* Hazard stripe decorative bar */
        .pm-hazard-bar {
          height: 5px; border-radius: 3px; width: 48px;
          background: repeating-linear-gradient(
            -45deg,
            hsl(45 100% 48%) 0px, hsl(45 100% 48%) 5px,
            hsl(40 76% 7%) 5px, hsl(40 76% 7%) 10px
          );
        }
      `}</style>

      <section className="pm-reviews-section" aria-label="Customer reviews">

        {/* ── Section Header ── */}
        <div
          style={{
            textAlign: "center",
            padding: "0 24px 52px",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          {/* Eyebrow */}
          <span
            style={{
              display: "inline-block",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "hsl(var(--ping-brown))",
              marginBottom: "16px",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            Real stories
          </span>

          {/* Heading */}
          <h2
            style={{
              fontSize: "clamp(26px, 4vw, 40px)",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.035em",
              color: "hsl(var(--foreground))",
              margin: "0 0 8px",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            From parking lots to{" "}
            <span
              style={{
                color: "hsl(var(--primary))",
                position: "relative",
                display: "inline-block",
              }}
            >
              peace of mind
              {/* Yellow underline highlight matching .highlight-underline::after */}
              <span
                style={{
                  position: "absolute",
                  bottom: "4px",
                  left: 0,
                  right: 0,
                  height: "12px",
                  background:
                    "linear-gradient(90deg, hsl(45 100% 48%), hsl(45 100% 54%))",
                  opacity: 0.3,
                  zIndex: -1,
                  borderRadius: "4px",
                }}
              />
            </span>
          </h2>

          {/* Hazard accent bar */}
          <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
            <div className="pm-hazard-bar" />
          </div>

          <p
            style={{
              fontSize: "15px",
              lineHeight: "1.75",
              color: "hsl(var(--muted-foreground))",
              margin: "0 0 24px",
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 400,
            }}
          >
            Vehicle owners across India — apartments, markets, offices — tell it in their own words.
          </p>

          {/* Rating badge */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
            <div className="pm-rating-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#F4B400" stroke="#F4B400" strokeWidth="1.5">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
              4.9 average · 1,200+ happy customers
            </div>

            <a href="/products" className="pm-cta-btn">
              Get Your Tag
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>

        {/* ── Marquee rows ── */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div className="pm-fade-left" />
          <div className="pm-fade-right" />

          <MarqueeRow items={row1} direction="left" speed={38} />
          <MarqueeRow items={row2} direction="right" speed={43} />
        </div>

      </section>
    </>
  );
};

export default LandingReviews;