import { useEffect, useState } from "react";
import "../../css/conversation/convoDefaultWindow.css";
import searchImg from "../../assets/images/magnifying-glass.png";

// helper components
import InsightsWindow from "./helpers/insights";
import MessageWindow from "./helpers/messages";

// controller
import { uploadExcelFile } from "../fileController/fileController";
import { getChatHistory, getMessages, sendMessage } from "./controller/chat";
import {
  getUserAllFiles,
  getFilesByName,
} from "../fileController/fileController";

function Conversation() {
  const [activeId, setActiveId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [yourFileActive, setYourFileActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchIcon, setShowSearchIcon] = useState(true);

  const [fileName, setFileName] = useState("");
  const [currentSheetId, setCurrentSheetId] = useState("");
  const [view, setView] = useState("upload");
  const [uploadStage, setUploadStage] = useState("uploading");
  const [search, setSearch] = useState("");

  const [history, setHistory] = useState([]);
  const [messages, setMessages] = useState([]);
  const [fileResponse, setFileResponse] = useState([]);
  const [yourFiles, setYourFiles] = useState([]);
  const [insights, setInsights] = useState([]);
  const [searchFiles, setSearchFiles] = useState([]);

  // on mount fetching
  useEffect(() => {
    getChatHistory(setHistory);
    getUserAllFiles(setYourFiles);
  }, []);

  //search file bebounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!search.trim()) {
        setIsSearching(false);
        setSearchFiles([]);
        return;
      }
      setIsSearching(true);
      await getFilesByName(search, setSearchFiles);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  const handleUploadClick = () => {
    if (uploading) return;
    document.querySelector(".upload-file-input").click();
  };

  const handleFileUpload = async (e) => {
    setUploading(true);
    setUploadStage("uploading");

    const timer = setTimeout(() => {
      setUploadStage("analyzing");
    }, 3000);

    const res = await uploadExcelFile(e, setFileResponse);

    clearTimeout(timer);

    if (!res) {
      setUploading(false);
      setUploadStage("uploading");
      return false;
    }

    getUserAllFiles(setYourFiles);
    setFileName(res.originalName);
    setInsights(res.insights);

    setUploading(false);
    setUploadStage("uploading");
    setView("insights");

    return;
  };

  // get the messages for the current file
  const handleSelectConversation = async (sheetId) => {
    const res = await getMessages(sheetId, setMessages);
    setView("chat");
    setSidebarOpen(false);
    return;
  };

  const handleNew = () => {
    setActiveId(null);
    setView("upload");
    setSidebarOpen(false);
  };

  // format date and time for side bar
  const formatTimeAgo = (date) => {
    const now = new Date();
    const past = new Date(date);

    const diffMs = now - past;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return "just now";
    }

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    if (diffHours < 24) {
      return `${diffHours}hr ago`;
    }

    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  };

  // this runs when a message is sent
  const onSendMessage = async (message) => {
    if (message.trim() == "") {
      return false;
    }

    const newMessage = {
      role: "user",
      text: message.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);

    const res = await sendMessage(currentSheetId, message, setMessages);
    return;
  };

  //handle file search
  const handleFileSearch = async (name, setFiles) => {
    const res = await getFilesByName(name, setYourFiles);
  };

  // your file section
  const filesToDisplay = search.trim() ? searchFiles : yourFiles;
  // handle yourfile section
  const openYourFile = () => {
    setYourFileActive((prev) => !prev);
  };

  const handleSearchIcon = () => {
    setShowSearchIcon((prev) => !prev);
  };

  // handle chat button.
  const handleChat = () => {
    setView("chat");
  };

  return (
    <div className="conversation-page">
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(true)}
        title="Show conversations"
        aria-label="Show conversations"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      <div
        className={`sidebar-backdrop ${sidebarOpen ? "show" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h2 className="mono">Conversations</h2>

          <button
            className="new-btn"
            onClick={handleNew}
            title="Start new upload"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {history.length === 0 ? (
          <span style={{ fontSize: "0.8rem", paddingLeft: "1.3rem" }}>
            No Recent Convos Yet.
          </span>
        ) : null}

        <div className="convo-list">
          {history.map((c) => (
            <div
              key={c.sheetId._id}
              className={`convo-item ${c.sheetId._id === activeId ? "active" : ""}`}
              onClick={() => {
                handleSelectConversation(c.sheetId._id);
                setInsights(c.sheetId.insights);
                setFileName(c.sheetId.originalName);
                setCurrentSheetId(c.sheetId._id);
              }}
            >
              <div className="convo-top">
                <div className="convo-name">
                  <span className="convo-dot" />
                  {c.sheetId.originalName}
                </div>

                <div className="convo-time mono">
                  {formatTimeAgo(c.createdAt)}
                </div>
              </div>

              <div className="convo-preview">{c.message}</div>
            </div>
          ))}
        </div>
        <div className="uploaded-files">
          <div className="heading-your-files-section" onClick={openYourFile}>
            <p className="heading-your-files">Your Files</p>
            <img
              src={searchImg}
              width="18"
              alt=""
              onClick={handleSearchIcon}
              className={!showSearchIcon ? "hide" : ""}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="type file name.."
              hidden={showSearchIcon}
              className="searchfileInput"
            />
          </div>

          {yourFiles.length === 0 && searchFiles.length === 0 ? (
            <p>No Files Uploaded yet!</p>
          ) : null}
          <div className={yourFileActive ? "files active" : "files"}>
            {search.trim() && (
              <button onClick={() => setSearch("")}>Clear Search</button>
            )}

            {filesToDisplay.length > 0 ? (
              filesToDisplay.map((file) => (
                <div className="yourfile" key={file._id}>
                  <p>{file.originalName}</p>

                  <button
                    onClick={() => {
                      handleSelectConversation(file._id);
                      setInsights(file.insights);
                      setFileName(file.originalName);
                      setCurrentSheetId(file._id);
                    }}
                  >
                    Talk
                  </button>
                </div>
              ))
            ) : (
              <p>No files found.</p>
            )}
          </div>
        </div>
      </aside>

      <main className="main-panel">
        {view === "upload" && (
          <div className="upload-view">
            <button
              className="upload-btn"
              onClick={handleUploadClick}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <span className="upload-spinner" />

                  {uploadStage === "uploading"
                    ? "Uploading your file..."
                    : "Analyzing your data..."}
                </>
              ) : (
                <>
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
                </>
              )}
            </button>

            <input
              type="file"
              hidden
              className="upload-file-input"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
            />
          </div>
        )}

        {view === "insights" && (
          <InsightsWindow
            fileName={fileName}
            insights={insights}
            SheetId={currentSheetId}
            onTalk={() => setView("chat")}
          />
        )}

        {view === "chat" && (
          <MessageWindow
            fileName={fileName}
            messages={messages}
            onSendMessage={onSendMessage}
            onBackToInsights={() => setView("insights")}
          />
        )}
      </main>
    </div>
  );
}

export default Conversation;
