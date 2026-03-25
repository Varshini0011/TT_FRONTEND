import { useState, useEffect } from "react";
import API from "./api";
import "./WorkerDashboard.css";
import NotificationBell from "./Notifications";
import { useNavigate } from "react-router-dom";

function WorkerDashboard() {
  const [complaints,   setComplaints]   = useState([]);
  const [activeTab,    setActiveTab]    = useState("assigned");
  const [reviewImages, setReviewImages] = useState({});   // { complaintId: base64string }
  const [submitting,   setSubmitting]   = useState({});   // { complaintId: bool }

  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem("user") || "{}");

  // eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => { loadComplaints(); }, []);

  const loadComplaints = () => {
    API.get(`/complaints/worker/${user.id}`)
      .then(res => setComplaints(res.data))
      .catch(err => console.error("Load error:", err));
  };

  // ── Store the chosen proof image as base64 ────────────────────────────────
  const handleProofImageSelect = (complaintId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setReviewImages(prev => ({ ...prev, [complaintId]: reader.result }));
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // allow re-selecting same file
  };

  // ── Submit review — send reviewImage in JSON body, NOT as a query param ───
  const submitReview = async (complaintId) => {
    const reviewImage = reviewImages[complaintId];
    if (!reviewImage) {
      alert("Please choose a proof photo first.");
      return;
    }

    setSubmitting(prev => ({ ...prev, [complaintId]: true }));

    try {
      // reviewImage is a large base64 string — must be in the request body
      await API.put(
        `/api/worker/update-status/${complaintId}`,
        { reviewImage }           // ← JSON body, not query param
      );

      alert("Submitted for review! ✅ Admin will verify shortly.");
      setReviewImages(prev => {
        const n = { ...prev };
        delete n[complaintId];
        return n;
      });
      loadComplaints();
    } catch (err) {
      console.error("Submit review error:", err);
      alert("Failed to submit review. Please check the backend is running.");
    }

    setSubmitting(prev => ({ ...prev, [complaintId]: false }));
  };

  const logout = () => { localStorage.removeItem("user"); navigate("/"); };

  const statusColor = (s) => ({
    PENDING:     "#E8A96E",
    IN_PROGRESS: "#5B9BD5",
    ASSIGNED:    "#F39C12",
    REVIEW:      "#9B59B6",
    SOLVED:      "#2ECC71",
  })[s] || "#aaa";

  const active   = complaints.filter(c => !["SOLVED","REVIEW"].includes(c.status));
  const inReview = complaints.filter(c => c.status === "REVIEW");
  const solved   = complaints.filter(c => c.status === "SOLVED");

  const shown = activeTab === "assigned" ? active
              : activeTab === "review"   ? inReview
              :                           solved;

  return (
    <div className="worker-page">
      {/* ── Sidebar ── */}
      <aside className="worker-sidebar">
        <div className="sidebar-brand">
          <span>🏛️</span>
          <span className="sb-title">CampusTrack</span>
        </div>
        <div className="sidebar-user">
          <div className="user-avatar">{user.username?.[0]?.toUpperCase()}</div>
          <div>
            <div className="user-name">{user.username}</div>
            <div className="user-role">Maintenance Worker</div>
          </div>
        </div>
        <nav className="worker-nav">
          <button
            className={activeTab === "assigned" ? "nav-item active" : "nav-item"}
            onClick={() => setActiveTab("assigned")}>
            🔧 My Tasks
            {active.length > 0 && <span className="nav-badge">{active.length}</span>}
          </button>
          <button
            className={activeTab === "review" ? "nav-item active" : "nav-item"}
            onClick={() => setActiveTab("review")}>
            🔍 In Review
            {inReview.length > 0 && <span className="nav-badge">{inReview.length}</span>}
          </button>
          <button
            className={activeTab === "solved" ? "nav-item active" : "nav-item"}
            onClick={() => setActiveTab("solved")}>
            ✅ Completed
            {solved.length > 0 && <span className="nav-badge">{solved.length}</span>}
          </button>
        </nav>
        <button className="logout-btn" onClick={logout}>⇤ Logout</button>
      </aside>

      {/* ── Main ── */}
      <main className="worker-main">
        <div className="worker-topbar">
          <h1 className="worker-heading">
            {activeTab === "assigned" && "Assigned Tasks"}
            {activeTab === "review"   && "Submitted for Review"}
            {activeTab === "solved"   && "Completed Complaints"}
          </h1>
          <NotificationBell username={user.username} />
        </div>

        {/* Summary strip */}
        <div className="worker-summary">
          <div className="summ-item">
            <span className="summ-val">{active.length}</span>
            <span className="summ-lbl">Active</span>
          </div>
          <div className="summ-item">
            <span className="summ-val">{inReview.length}</span>
            <span className="summ-lbl">In Review</span>
          </div>
          <div className="summ-item">
            <span className="summ-val">{solved.length}</span>
            <span className="summ-lbl">Solved</span>
          </div>
        </div>

        {/* Task cards */}
        {shown.length === 0 ? (
          <div className="empty-state">
            <span>📭</span>
            <p>No complaints in this category.</p>
          </div>
        ) : (
          <div className="tasks-grid">
            {shown.map(c => (
              <div className="task-card" key={c.id}>

                {/* Card header */}
                <div className="task-header">
                  <div className="task-id">#{c.id}</div>
                  <span className="status-badge"
                    style={{ background: statusColor(c.status) }}>
                    {c.status.replace("_", " ")}
                  </span>
                </div>

                {/* Details */}
                <div className="task-body">
                  <h3 className="task-issue">{c.issueType}</h3>
                  <div className="task-meta">
                    <span>📍 {c.location}</span>
                    <span>👤 {c.raisedByName || c.raisedBy}</span>
                  </div>
                  <p className="task-desc">{c.description}</p>
                </div>

                {/* Issue photo */}
                {c.image && (
                  <div className="task-img-wrap">
                    <p className="img-label">Issue Photo</p>
                    <img src={c.image} alt="issue" className="task-img"
                      onClick={() => window.open(c.image)} />
                  </div>
                )}

                {/* ── Proof upload section (active tasks only) ── */}
                {["IN_PROGRESS","ASSIGNED","PENDING"].includes(c.status) && (
                  <div className="proof-section">
                    <p className="img-label">Upload Proof Photo</p>

                    {/* Native file picker — works on HTTP, no permissions needed */}
                    <label className="upload-label-btn">
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={e => handleProofImageSelect(c.id, e)}
                      />
                      📁 Choose Photo
                    </label>

                    {/* Preview chosen proof image */}
                    {reviewImages[c.id] && (
                      <img
                        src={reviewImages[c.id]}
                        alt="proof preview"
                        className="proof-preview"
                      />
                    )}

                    <button
                      className="review-submit-btn"
                      disabled={!reviewImages[c.id] || submitting[c.id]}
                      onClick={() => submitReview(c.id)}>
                      {submitting[c.id] ? "Submitting…" : "✓ Submit for Review"}
                    </button>
                  </div>
                )}

                {/* Already submitted proof */}
                {["REVIEW","SOLVED"].includes(c.status) && c.reviewImage && (
                  <div className="task-img-wrap">
                    <p className="img-label">Your Proof Photo</p>
                    <img src={c.reviewImage} alt="proof" className="task-img"
                      onClick={() => window.open(c.reviewImage)} />
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default WorkerDashboard;
