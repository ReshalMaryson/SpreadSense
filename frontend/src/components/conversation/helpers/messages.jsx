import { useState } from "react";
import "../../../css/conversation/messageWindow.css";

function MessageWindow({
  fileName,
  messages,
  onSendMessage,
  onBackToInsights,
}) {
  const [draft, setDraft] = useState("");

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      onSendMessage(draft);
      setDraft("");
    }
  };

  // format time
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  //remove markdowns
  const cleanMessage = (text) => {
    return text
      .replace(/\*\*/g, "")
      .replace(/__/g, "")
      .replace(/^#+\s*/gm, "")
      .replace(/`/g, "");
  };

  return (
    <div className="convo-window">
      <div className="chat-header">
        <div className="who">
          <div className="chat-avatar">{fileName.charAt(0).toUpperCase()}</div>
          <div>
            <div className="name">{fileName}</div>
            <div className="status">Online · knows this file</div>
          </div>
        </div>
        <button className="back-to-insights" onClick={onBackToInsights}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M14 18l-6-6 6-6" />
          </svg>
          Insights
        </button>
      </div>

      <div className="chat-body">
        {messages.map((m, i) => (
          <div className={`msg ${m.role}`} key={i}>
            {cleanMessage(m.text)}
            <p style={{ textAlign: "right", fontSize: "0.7rem" }}>
              {formatTime(m.createdAt)}
            </p>
          </div>
        ))}
      </div>

      <div className="chat-input-wrap">
        <div className="chat-input">
          <input
            type="text"
            placeholder="Type your message..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="send-btn"
            onClick={() => {
              onSendMessage(draft);
              setDraft("");
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default MessageWindow;
