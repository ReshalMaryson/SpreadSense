import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  const [user, setUser] = useState([]);
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
    <div className="landing" style={{ height: "100px", minHeight: "100vh" }}>
      <div className="grid-texture" />

      <main>
        <section className="hero">
          <div className="headline-box">
            <h1 key={current} className="headline">
              <span className="headline-line">{headline.line1}</span>

              <span className="headline-line green">{headline.line2}</span>
            </h1>
          </div>

          <div className="cta-wrap">
            <Link
              to="/conversation"
              className="cta-btn"
              style={{ color: "#f6f1e4" }}
              // onClick={(e) => {
              //   e.preventDefault();
              //   document.querySelector(".landing-page-file-input").click();
              // }}
            >
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
            </Link>
            <input type="file" hidden className="landing-page-file-input" />
            <div className="cta-note">
              No sign-up needed to see what it finds.
            </div>
          </div>
        </section>
      </main>

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
