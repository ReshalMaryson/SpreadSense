import "../../../css/conversation/insights.css";

// const DUMMY_INSIGHTS = [
//   {
//     title: "Most Expensive Months",
//     finding:
//       "April and August combined for over 35M in revenue — nearly double any other pair of months.",
//   },
//   {
//     title: "A Clear Frontrunner",
//     finding:
//       "Kia outsold every other brand in the sheet, appearing in two out of every three sales rows.",
//   },
//   {
//     title: "One City Pulls Ahead",
//     finding:
//       "Karachi alone accounts for the largest share of total transaction value in the dataset.",
//   },
//   {
//     title: "A Slow Start",
//     finding:
//       "January brought in the lowest revenue of any month — less than half of April's total.",
//   },
//   {
//     title: "Top Individual Performer",
//     finding:
//       "One sales rep closed more total value than the next two highest combined.",
//   },
//   {
//     title: "A Model Worth Watching",
//     finding:
//       "The Sorento outsold every other model despite appearing in fewer listings overall.",
//   },
// ];

function InsightsWindow({ fileName, insights, onTalk, SheetId }) {
  alert(SheetId);
  return (
    <div className="insights-window">
      <div className="insights-header">
        <div className="file-tag">
          <span className="dot" />
          <span>{fileName}</span>
        </div>
        <h2>Six things worth knowing.</h2>
      </div>

      <div className="insights-body">
        <div className="insight-grid">
          {insights.map((ins, i) => (
            <div className="insight-card" key={i}>
              <div className="num mono">0{i + 1}</div>
              <h4>{ins.title}</h4>
              <p>{ins.finding}</p>
            </div>
          ))}
        </div>

        <div className="talk-cta">
          <button className="talk-btn" onClick={onTalk}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            Talk to it
          </button>
          <span className="note">
            Ask it anything — it already knows what's in here.
          </span>
        </div>
      </div>
    </div>
  );
}

export default InsightsWindow;
