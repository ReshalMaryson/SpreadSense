import "../../../css/user/profile.css";

import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/authContext";

// controller
import { logoutAttempt } from "../../auth/controllers/authControllers";
import { getUserAllFiles } from "../../fileController/fileController";
import {
  deleteAccount,
  getUser,
  updateUser,
} from "../controllers/userController";

export default function Profile() {
  const [userFiles, setUserFiles] = useState([]);

  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);
  //error states
  const [profileFeildsError, setProfileFeildsError] = useState("");

  // get logged in user and its states
  const [user, setUser] = useState(null);
  const [updateData, setUpdateData] = useState({
    name: "",
    email: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  // load profile data on mount
  useEffect(() => {
    getUser(setUser); // this gets only logged in user.
    getUserAllFiles(setUserFiles); // get the user files.
  }, []);

  //set the update fields as the data got from server.
  useEffect(() => {
    if (user) {
      setUpdateData({
        name: user.name || "",
        email: user.email || "",
      });
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

  const handleDeleteFile = (fileName) => {
    alert(`Delete "${fileName}"`);
  };

  const handleDownload = (fileName) => {
    alert(`Download "${fileName}"`);
  };

  const handleDeleteAccount = () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This cannot be undone.",
    );

    if (confirmed) {
      alert("Account deletion requested.");
    }
  };
  // format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) {
      return `${bytes} Bytes`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };
  return (
    <div className="profile-page">
      <main className="profile-main">
        <section className="profile-intro">
          <span className="profile-label">YOUR ACCOUNT</span>

          <h1>
            Your <em>profile.</em>
          </h1>

          <p>
            Manage your personal information and
            <br />
            everything you've brought into SpreadSense.
          </p>
        </section>

        <section className="profile-section">
          <div className="section-heading">
            <div>
              <span className="section-label">PERSONAL DETAILS</span>
              <h2>Your information</h2>
            </div>
          </div>

          <form
            className="details-card"
            onSubmit={(e) => {
              handleSave(e, updateData);
            }}
          >
            <div className="profile-form-group">
              <label htmlFor="profile-name">Full name</label>

              <input
                id="profile-name"
                type="text"
                name="name"
                value={updateData.name}
                onChange={handleChange}
              />
            </div>

            <div className="profile-form-group">
              <label htmlFor="profile-email">Email address</label>
              <input
                id="profile-email"
                type="email"
                name="email"
                value={updateData.email}
                onChange={handleChange}
                readOnly
              />
              <span className="profile-email-label">
                {" "}
                Email can't be update from this page
              </span>
            </div>
            {message && (
              <p
                style={{
                  color:
                    message === "Missing required fields."
                      ? "#ff7e65"
                      : "#11261b",
                  transition: "100ms",
                  fontSize: "0.8rem",
                }}
              >
                {message}
              </p>
            )}
            <div className="details-footer">
              <span>Your information is private to your account.</span>

              <button type="submit" className="save-button">
                Save changes
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
            </div>
          </form>
        </section>

        <section className="profile-section files-section">
          <div className="section-heading">
            <div>
              <span className="section-label">YOUR FILES</span>
              <h2>Uploaded spreadsheets</h2>
            </div>
            {/* <span className="file-count">{userFiles.files.length} files</span> */}
          </div>
          <div className="showFileBox">
            <div className="files-list">
              {userFiles.length > 0 ? (
                userFiles.map((file) => (
                  <div className="file-item" key={file.fileid}>
                    <div className="file-icon">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                        <path d="M8 13h8" />
                        <path d="M8 17h5" />
                      </svg>
                    </div>

                    <div className="file-info">
                      <h3>{file.originalName}</h3>

                      <p>
                        XLSX <span>·</span> {formatFileSize(file.fileSize)}
                      </p>
                    </div>

                    <div className="file-actions">
                      <button
                        type="button"
                        onClick={() => handleDownload(file.fileid)}
                      >
                        Download
                      </button>

                      <button
                        type="button"
                        className="file-delete"
                        onClick={() => handleDeleteFile(file.fileid)}
                        aria-label={`Delete ${file.originalName}`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6l-1 15H6L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p>No files Uploaded Yet!</p>
              )}
            </div>
          </div>
        </section>

        <section className="profile-section danger-section">
          <div className="danger-content">
            <span className="section-label">DANGER ZONE</span>

            <h2>Delete your account</h2>

            <p>
              Permanently delete your account and all uploaded files. This
              action cannot be undone.
            </p>
          </div>

          <button
            type="button"
            className="delete-account-button"
            onClick={handleDeleteAccount}
          >
            Delete account
          </button>
        </section>

        <footer className="profile-footer">
          <span>© 2026 SpreadSense</span>

          <Link to="/">Back to home</Link>
        </footer>
      </main>
    </div>
  );
}
