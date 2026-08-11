import "../../../css/user/profile.css";
import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/authContext";

//controllers
import { logoutAttempt } from "../../auth/controllers/authControllers";
import {
  deleteAccount,
  getUser,
  updateUser,
} from "../controllers/userController";

// helper
import ReviewHistory from "./helpers/reviewHistory";

export default function Profile() {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  //error states
  const [profileFeildsError, setProfileFeildsError] = useState("");

  // UI controls
  const [activeReviewHistory, setActiveReviewHistory] = useState(false);
  const [activePersonalInfo, setActivePersonalInfo] = useState(true);

  const [user, setUser] = useState(null);
  const [updateData, setUpdateData] = useState({
    name: "",
    email: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  // load profile data on mount
  useEffect(() => {
    getUser(setUser);
  }, []);

  useEffect(() => {
    if (user) {
      setUpdateData({
        name: user.name || "",
        email: user.email || "",
      });

      console.log(user);
    }
  }, [user]);

  // for input fields
  function handleChange(event) {
    setUpdateData((previousData) => ({
      ...previousData,
      [event.target.name]: event.target.value,
    }));

    setMessage("");
  }

  // update button
  async function handleSave(event, updateData) {
    event.preventDefault();
    if (updateData.name.trim() === "" || updateData.email.trim() === "") {
      setMessage("Missing required fields.");
      setTimeout(() => setMessage(""), 2000);
      return;
    }
    setIsSaving(true);
    setMessage("");
    const result = await updateUser(updateData, setUser);

    setIsSaving(false);
    setMessage(
      result ? "Your profile has been updated." : "Something went wrong.",
    );

    setTimeout(() => setMessage(""), 2000);
  }

  // delete
  function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete your CriticAI account? This cannot be undone.",
    );

    if (confirmed && user?._id) {
      deleteAccount(logoutAttempt, navigate, logout);
    }
  }

  function showReviewHistory() {
    setActiveReviewHistory(true);
    setActivePersonalInfo(false);
  }

  function showPersonalInfo() {
    setActiveReviewHistory(false);
    setActivePersonalInfo(true);
  }

  //condional render
  if (!user) {
    return (
      <main className="profile-page">
        <div className="profile-loading">Loading your profile...</div>
      </main>
    );
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  return (
    <main className="profile-page">
      <section className="profile-layout">
        <aside className="profile-sidebar">
          <div className="profile-avatar">{initials}</div>

          <p className="profile-label">CRITICAI MEMBER</p>
          <h1>{user.name}</h1>
          <p className="profile-email">{user.email}</p>

          <div className="profile-divider" />

          <div
            className="profile-history"
            role="button"
            tabIndex={0}
            onClick={showReviewHistory}
            onKeyDown={(e) => e.key === "Enter" && showReviewHistory()}
          >
            <div className="history-icon">⌘</div>
            <div>
              <p>Review History</p>
              <span>Your latest code reviews are available in Generate.</span>
            </div>
          </div>

          <Link to="/generate" className="profile-review-link">
            Review new code <span>→</span>
          </Link>
        </aside>

        {activeReviewHistory ? (
          <ReviewHistory showPersonalInfo={showPersonalInfo} />
        ) : (
          <section className="profile-content">
            <p className="profile-eyebrow">ACCOUNT SETTINGS</p>
            <h2>
              Hello, <span>{user.name.split(" ")[0]}.</span>
            </h2>
            <p className="profile-intro">
              Keep your personal details up to date and manage your CriticAI
              account.
            </p>

            <form
              className="profile-form"
              onSubmit={(e) => {
                handleSave(e, updateData);
              }}
            >
              <div className="profile-form-heading">
                <div>
                  <h3>Personal information</h3>
                  <p>These details are used across your CriticAI account.</p>
                </div>
              </div>

              <div className="profile-field">
                <label htmlFor="name">Display name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={updateData.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  // required
                />
              </div>

              <div className="profile-field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={updateData.email}
                  readOnly
                />
                <small>Email address cannot be changed from this page.</small>
              </div>
              {/* <div className="field-error">{profileFeildsError}</div> */}
              <div className="profile-form-actions">
                {message && (
                  <p
                    style={{
                      color:
                        message === "Missing required fields."
                          ? "#ff7e65"
                          : "#c0e687",
                      transition: "100ms",
                      fontSize: "0.8rem",
                    }}
                  >
                    {message}
                  </p>
                )}

                <button
                  type="submit"
                  className="profile-save-btn"
                  disabled={isSaving}
                >
                  {!isSaving ? "Save changes" : "Saving..."}
                </button>
              </div>
            </form>

            <div className="profile-danger-zone">
              <div>
                <h3>Delete account</h3>
                <p>Permanently remove your account and all associated data.</p>
              </div>

              <button
                type="button"
                className="profile-delete-btn"
                onClick={handleDelete}
              >
                Delete account
              </button>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
