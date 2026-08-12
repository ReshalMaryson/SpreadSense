import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../css/auth/signup.css";

// controller
import { signUp } from "../auth/controllers/authControllers";

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");

  const navigate = useNavigate();
  const [errMessage, setErrMessage] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // handle form error and send request for sign - up
  async function handleSubmit(e) {
    e.preventDefault();
    if (formData.password != confirmPassword) {
      setErrMessage("password and confirm password did not match");
      return;
    }
    await signUp(navigate, formData, setFormData, setErrMessage, setLoading);
  }

  // clear the message
  useEffect(() => {
    if (!errMessage) return;
    const timer = setTimeout(() => {
      setErrMessage("");
    }, 2000);

    return () => clearTimeout(timer);
  }, [errMessage]);

  return (
    <div className="signup-page">
      <section className="signup-intro">
        <div className="intro-content">
          <span className="intro-label">MADE FOR EVERYDAY DECISIONS</span>

          <h1>
            Make sense of
            <br />
            your data.
            <br />
            <em>with clarity.</em>
          </h1>

          <div className="intro-divider">
            <span></span>
            <span className="divider-symbol">✳</span>
            <span></span>
          </div>

          <p>
            Create your account and start
            <br />
            getting more from your data.
          </p>
        </div>
      </section>

      <section className="signup-form-section">
        <div className="signup-form-container">
          <div className="signup-heading">
            <h2>Create your account</h2>
            <p>Get started with SpreadSense.</p>
          </div>

          <form
            onSubmit={(e) => {
              handleSubmit(e);
            }}
          >
            <div className="form-group">
              <label htmlFor="name">Full name</label>

              <div className="input-wrapper">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
                </svg>

                <input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
            </div>

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
                  placeholder="youremail@example.com"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
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
                  placeholder="Create a password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {showPassword ? (
                      <>
                        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </>
                    ) : (
                      <>
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-3.1 3.9" />
                        <path d="M6.6 6.6C3.8 8.3 2 12 2 12s3.5 7 10 7c1.5 0 2.8-.3 4-.8" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">Confirm password</label>

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
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label="Toggle password visibility"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {showConfirmPassword ? (
                      <>
                        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </>
                    ) : (
                      <>
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-3.1 3.9" />
                        <path d="M6.6 6.6C3.8 8.3 2 12 2 12s3.5 7 10 7c1.5 0 2.8-.3 4-.8" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>
            <div className="show-errMessage-signup">
              {errMessage && (
                <p
                  style={{
                    color:
                      errMessage === "Missing required fields."
                        ? "red"
                        : "#11261b",
                    transition: "100ms",
                    fontSize: "0.9rem",
                  }}
                >
                  {errMessage}
                </p>
              )}
            </div>
            <button type="submit" className="signup-submit">
              Create account
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

          <button className="google-button" type="button">
            <span className="google-icon">G</span>
            Continue with Google
          </button>

          <p className="login-text">
            Already have an account?
            <Link to="/login">Log in</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
