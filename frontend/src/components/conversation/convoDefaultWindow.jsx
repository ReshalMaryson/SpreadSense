import { useState } from "react";
import "../../css/conversation/convoDefaultWindow.css";

// helper components
import InsightsWindow from "./helpers/insights";
const DUMMY_CONVERSATIONS = [
  {
    sheetId: "c1",
    fileName: "ClassDataSet.xlsx",
    preview: "Kia's your strongest seller in Karachi.",
    time: "2h ago",
  },
  {
    sheetId: "c2",
    fileName: "Marketing_Budget.xlsx",
    preview: "April ate up 40% of the quarter's spend.",
    time: "Yesterday",
  },
  {
    sheetId: "c3",
    fileName: "Inventory_June.xls",
    preview: "3 items are close to running out.",
    time: "3 days ago",
  },
];

function Conversation() {
  const [view, setView] = useState("upload"); // 'upload' | 'insights' | 'chat'
  const [activeId, setActiveId] = useState(null);

  const handleUploadClick = () => {
    // controller call goes here later — for now just a stub
    console.log("upload clicked");
  };

  const handleSelectConversation = (sheetId) => {
    setActiveId(sheetId);
    // will switch to chat view + fetch messages once that piece is built
  };

  const handleNew = () => {
    setActiveId(null);
    setView("insights");
  };

  return (
    <div className="conversation-page">
      <aside className="sidebar">
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
        {DUMMY_CONVERSATIONS.length === 0 ? (
          <span style={{ fontSize: "0.8rem", paddingLeft: "1.3rem" }}>
            No Recent Convos Yet.
          </span>
        ) : null}
        <div className="convo-list">
          {DUMMY_CONVERSATIONS.map((c) => (
            <div
              key={c.sheetId}
              className={`convo-item ${c.sheetId === activeId ? "active" : ""}`}
              onClick={() => handleSelectConversation(c.sheetId)}
            >
              <div className="convo-top">
                <div className="convo-name">
                  <span className="convo-dot" />
                  {c.fileName}
                </div>
                <div className="convo-time mono">{c.time}</div>
              </div>
              <div className="convo-preview">{c.preview}</div>
            </div>
          ))}
        </div>
      </aside>

      <main className="main-panel">
        {view === "upload" && (
          <div className="upload-view">
            <button className="upload-btn" onClick={handleUploadClick}>
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
            </button>
          </div>
        )}
        {view === "insights" && (
          <InsightsWindow fileName="" insights="" onTalk="" />
        )}
      </main>
    </div>
  );
}

export default Conversation;
