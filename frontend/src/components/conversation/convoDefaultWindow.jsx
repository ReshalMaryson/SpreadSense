import { useState } from "react";
import "../../css/conversation/convoDefaultWindow.css";

// helper components
import InsightsWindow from "./helpers/insights";
import MessageWindow from "./helpers/messages";

// controller
import { uploadExcelFile } from "../fileController/fileController";

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
  const [view, setView] = useState("upload");
  const [activeId, setActiveId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [fileResponse, setFileResponse] = useState([]);
  const [insights, setInsights] = useState([]);
  const [fileName, setFileName] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState("uploading");

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

    setFileName(res.originalName);
    setInsights(res.insights);

    setUploading(false);
    setUploadStage("uploading");
    setView("insights");

    return;
  };

  const handleSelectConversation = (sheetId) => {
    setActiveId(sheetId);
    setSidebarOpen(false);
  };

  const handleNew = () => {
    setActiveId(null);
    setView("upload");
    setSidebarOpen(false);
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
            onTalk={() => setView("chat")}
          />
        )}

        {view === "chat" && (
          <MessageWindow
            fileName="Q3_Sales.xlsx"
            messages=""
            onSendMessage=""
            onBackToInsights={() => setView("insights")}
          />
        )}
      </main>
    </div>
  );
}

export default Conversation;
