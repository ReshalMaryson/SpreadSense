import { useEffect, useState } from "react";
import "../../css/landingPage/landingPage.css";

const HEADLINES = [
  {
    line1: "It's alive. It's here to",
    line2: "answer you.",
  },
  {
    line1: "Talk to your business,",
    line2: "right where it lives.",
  },
  {
    line1: "Your numbers have more",
    line2: "to tell you.",
  },
  {
    line1: "Ask your data. Get the",
    line2: "answer you need.",
  },
  {
    line1: "There's more in your",
    line2: "spreadsheet than cells.",
  },
];
export default function LandingPage() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % HEADLINES.length);
    }, 3200);

    return () => clearInterval(timer);
  }, []);

  const headline = HEADLINES[current];

  return (
    <div className="landing">
      <div className="grid-texture" />

      {/* NAV */}
      <nav>
        <div className="logo">
          <svg viewBox="0 0 40 40" fill="none">
            <g stroke="#1F8A4C" strokeWidth="3.4" strokeLinecap="round">
              <line x1="20" y1="4" x2="20" y2="36" />
              <line x1="4" y1="20" x2="36" y2="20" />
              <line x1="8" y1="8" x2="32" y2="32" />
              <line x1="32" y1="8" x2="8" y2="32" />
            </g>
          </svg>

          <span>SpreadSense</span>
        </div>

        <div className="nav-right">
          <div className="nav-links">
            <a href="#how">How it works</a>
            <a href="#profile">Profile</a>
          </div>

          <a href="#login" className="login-btn">
            Log in
          </a>
        </div>
      </nav>

      {/* HERO */}
      <main>
        <section className="hero">
          <div className="headline-box">
            <h1 key={current} className="headline">
              <span className="headline-line">{headline.line1}</span>

              <span className="headline-line green">{headline.line2}</span>
            </h1>
          </div>

          <div className="cta-wrap">
            <a href="#upload" className="cta-btn" style={{ color: "#f6f1e4" }}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3v13M7 8l5-5 5 5M5 21h14" />
              </svg>
              Upload your file
            </a>

            <div className="cta-note">
              No sign-up needed to see what it finds.
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer>
        <div>© 2026 SpreadSense</div>

        <div className="mono">
          MADE FOR PEOPLE WHO'D RATHER ASK
          <span className="dot"> · </span>
          THAN SCROLL
        </div>
      </footer>
    </div>
  );
}
