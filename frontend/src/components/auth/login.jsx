import "../../css/auth/login.css";
import { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/authContext";

// Controllers
import { loginAttempt } from "./controllers/authControllers";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const userCredentials = {
    email: email.trim(),
    password: password.trim(),
  };

  // handle login errors
  async function handlelogin() {
    setErrorMessage(""); // clear old error first
    if (email.trim() === "" || password.trim() === "") {
      setErrorMessage("Missing required fields.");
      return;
    }
    await loginAttempt({ email, password }, navigate, login, setErrorMessage);
  }

  // clear the message
  useEffect(() => {
    if (!errMessage) return;
    setEmail("");
    setPassword("");
    const timer = setTimeout(() => {
      setErrorMessage("");
    }, 2000);

    return () => clearTimeout(timer);
  }, [errMessage]);

  return (
    <div className="login-page">
      <section className="login-intro">
        <div className="intro-content">
          <span className="intro-label">MADE FOR EVERYDAY DECISIONS</span>

          <h1>
            Welcome back.
            <br />
            Let’s continue
            <br />
            <em>with clarity.</em>
          </h1>

          <div className="intro-divider">
            <span></span>
            <span className="divider-symbol">✳</span>
            <span></span>
          </div>

          <p>
            Login to access your dashboard
            <br />
            and get insights from your data.
          </p>
        </div>
      </section>

      <section className="login-form-section">
        <div className="login-form-container">
          <div className="login-heading">
            <h2>Log in to SpreadSense</h2>
          </div>

          <form>
            <div className="form-group">
              <label htmlFor="email">Email address</label>

              <div className="input-wrapper email-input">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>

                <input
                  id="email"
                  type="email"
                  placeholder="youremail@sense.com"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group password-group">
              <label htmlFor="password">Password</label>

              <div className="input-wrapper">
                <svg
                  className="input-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="5" y="10" width="14" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5 0 8.5 4 9.5 6a11.7 11.7 0 0 1-3.1 3.5" />
                      <path d="M6.2 6.2C4.5 7.4 3.4 9 2.5 10c1 2 4.5 6 9.5 6 1.2 0 2.3-.2 3.3-.6" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                      <circle cx="12" cy="12" r="2.5" />
                    </svg>
                  )}
                </button>
              </div>

              <a href="/forgot-password" className="forgot-password">
                Forgot password?
              </a>
            </div>
            <div className="show-errMessage">
              {errMessage && (
                <p
                  style={{
                    color:
                      errMessage === "Missing required fields."
                        ? "#ff7e65"
                        : "#11261b",
                    transition: "100ms",
                    fontSize: "0.8rem",
                  }}
                >
                  {errMessage}
                </p>
              )}
            </div>
            <button
              type="button"
              className="login-submit"
              onClick={() => {
                handlelogin();
              }}
            >
              <span>Log in</span>

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </button>
          </form>

          <div className="or-divider">
            <span></span>
            <p>or</p>
            <span></span>
          </div>

          <button type="button" className="google-button">
            <span className="google-icon">G</span>
            <span>Continue with Google</span>
          </button>

          <p className="signup-text">
            Don’t have an account?
            <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
