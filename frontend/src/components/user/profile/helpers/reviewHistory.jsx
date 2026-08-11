import "../../../../css/user/reviewHistory.css";
import { useEffect, useState } from "react";
import ReviewResponse from "../../../generate/helpers/reviewResponse";

// controller
import { userReviews } from "../../../generate/controller/generateController";
import { useAsyncValue } from "react-router-dom";

export default function ReviewHistory({ showPersonalInfo }) {
  const [userReview, setUserReviews] = useState([]);
  const [responseKeyword, setresponseKeyword] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [message, setMessage] = useState("");

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadResources(pageNum = 1, append = false) {
    const response = await userReviews(
      setUserReviews,
      setMessage,
      pageNum,
      append,
    );
    setresponseKeyword(response);
    if (response?.hasMore !== undefined) {
      setHasMore(response.hasMore);
    }
  }

  useEffect(() => {
    loadResources(1, false);
  }, []);

  async function handleLoadMore() {
    setLoadingMore(true);
    const nextPage = page + 1;
    await loadResources(nextPage, true);
    setPage(nextPage);
    setLoadingMore(false);
  }

  function toggleExpanded(id) {
    setExpandedId((current) => (current === id ? null : id));
  }

  function formatDateTime(isoString) {
    const date = new Date(isoString);
    const datePart = date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "2-digit",
    });
    const timePart = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${datePart}, ${timePart}`;
  }

  return (
    <div className="review-history-list">
      <div className="histroyheader">
        <p onClick={showPersonalInfo}>←</p>
        <p className="heading-history">History</p>
      </div>
      {userReview.length > 0 ? (
        <>
          {userReview.map((entry) => {
            const data = entry.result?.result;
            if (!data) return null;

            const isExpanded = expandedId === entry._id;

            return (
              <div key={entry._id} className="review-history-item">
                <div
                  className={`review-history-header ${isExpanded ? "active" : ""}`}
                  onClick={() => toggleExpanded(entry._id)}
                >
                  <span className="review-history-title">{data.title}</span>
                  <span className="review-history-language">
                    {entry.language}
                  </span>
                  <span className="review-history-score">{data.score}</span>
                  <span className="review-history-date">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>

                <div
                  className={`review-history-body ${isExpanded ? "active" : ""}`}
                >
                  <ReviewResponse review={data} keyword={true} />
                </div>
              </div>
            );
          })}

          {hasMore && (
            <button
              className="load-more-btn"
              disabled={loadingMore}
              onClick={handleLoadMore}
              style={{
                width: "16%",
                margin: "0 auto",
                borderRadius: "10px",
                padding: "0.7rem",
              }}
            >
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          )}
        </>
      ) : message ? (
        <h3 style={{ textAlign: "center" }}>{message}</h3>
      ) : (
        <h1 className="loading-reviews-heading">Loading Reviews...</h1>
      )}
    </div>
  );
}
