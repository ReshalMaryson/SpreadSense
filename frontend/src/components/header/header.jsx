import { Link, useNavigate } from "react-router-dom";
import "../../css/header/header.css";
import { useContext, useState } from "react";
import { AuthContext } from "../../context/authContext";
import { logoutAttempt } from "../auth/controllers/authControllers";

export default function Header() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav>
      <div className="logo">
        <Link to="/" style={{ textDecoration: "none", color: "#11261b" }}>
          <svg viewBox="0 0 40 40" fill="none">
            <g stroke="#1F8A4C" strokeWidth="3.4" strokeLinecap="round">
              <line x1="20" y1="4" x2="20" y2="36" />
              <line x1="4" y1="20" x2="36" y2="20" />
              <line x1="8" y1="8" x2="32" y2="32" />
              <line x1="32" y1="8" x2="8" y2="32" />
            </g>
          </svg>

          <span style={{ marginLeft: "5px" }}>SpreadSense</span>
        </Link>
      </div>

      {/* Desktop navigation */}
      <div className="nav-right">
        <div className="nav-links">
          <Link to="/how" style={{ textDecoration: "none" }}>
            How it works
          </Link>
        </div>

        {user ? (
          <>
            <Link to="/profile" className="profile-link">
              Profile
            </Link>

            <button
              className="login-btn"
              style={{
                textDecoration: "none",
                color: "#f6f1e4",
                backgroundColor: "#11261b",
                cursor: "pointer",
              }}
              onClick={() => logoutAttempt(navigate, logout)}
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="login-btn"
            style={{
              textDecoration: "none",
              color: "#f6f1e4",
              backgroundColor: "#11261b",
            }}
          >
            Log in
          </Link>
        )}
      </div>

      {/* Mobile hamburger */}
      <button className="hamburger-btn" onClick={() => setMenuOpen(true)}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile sidebar */}
      <div className={`sidebar ${menuOpen ? "open" : ""}`}>
        {/* Close button */}
        <button
          className="sidebar-close-btn"
          onClick={() => setMenuOpen(false)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>

        {/* Sidebar links */}
        <div className="sidebar-links">
          <Link
            to="/how"
            onClick={() => setMenuOpen(false)}
            className="sidebar-link-mobile"
            style={{ fontSize: "1.5rem" }}
          >
            How it works
          </Link>

          {user ? (
            <>
              <Link
                to="/profile"
                className="profile-link-mobile"
                style={{ fontSize: "1.5rem" }}
              >
                Profile
              </Link>

              <button
                className="sidebar-logout-btn"
                onClick={() => {
                  setMenuOpen(false);
                  logoutAttempt(navigate, logout);
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" onClick={() => setMenuOpen(false)}>
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
