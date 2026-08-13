import { useState } from "react";
import "../../../css/conversation/messageWindow.css";

const DUMMY_MESSAGES = [
  {
    role: "file",
    text: "I've read through this file — go ahead and ask me anything about it.",
  },
  { role: "user", text: "Which brand sells the most?" },
  {
    role: "file",
    text: "Kia — it shows up in two out of every three sales rows, well ahead of Toyota or Honda.",
  },
];

function MessageWindow({
  fileName = "Q3_Sales.xlsx",
  messages = DUMMY_MESSAGES,
  onSendMessage = (text) => console.log("send:", text),
  onBackToInsights = () => console.log("back to insights"),
}) {
  const [draft, setDraft] = useState("");

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setDraft("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
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
            {m.text}
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
          <button className="send-btn" onClick={handleSend}>
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

export default ConvoWindow;
