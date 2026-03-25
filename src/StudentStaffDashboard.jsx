import { useState, useEffect } from "react";
import API from "./api";
import "./studentStaff.css";
import CameraCapture from "./components/CameraCapture";
import NotificationBell from "./Notifications";
import { useNavigate } from "react-router-dom";

function StudentStaff({ role }) {
  const [location,     setLocation]     = useState("");
  const [issueType,    setIssueType]    = useState("");
  const [description,  setDescription]  = useState("");
  const [complaints,   setComplaints]   = useState([]);
  const [image,        setImage]        = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [activeTab,    setActiveTab]    = useState("submit");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [priority,     setPriority]     = useState(2);

  const navigate  = useNavigate();
  const user      = JSON.parse(localStorage.getItem("user") || "{}");
  const endpoint  = (user.role === "STAFF" || user.role === "TEACHER")
                      ? "/api/teacher/complaint"
                      : "/api/student/complaint";
  const roleLabel = (user.role === "STAFF" || user.role === "TEACHER")
                      ? "Teacher" : "Student";

 // eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => { loadComplaints(); }, []);

  const loadComplaints = () => {
    API.get(`/complaints/user/${user.username}`)
      .then(res => setComplaints(res.data))
      .catch(err => console.error(err));
  };

  const handleDetect = (issue, desc, img) => {
    if (issue) setIssueType(issue);
    if (desc)  setDescription(desc);
    if (img)   setImage(img);
  };

  const submitComplaint = async () => {
    if (!location || !issueType || !description) {
      alert("Please fill in Location, Issue Type, and Description.");
      return;
    }
    setSubmitting(true);
    try {
      await API.post(endpoint, {
        raisedBy:     user.username,
        raisedByName: user.username,
        location,
        issueType,
        description,
        priority,
        image: image || null
      });
      alert("Complaint Submitted Successfully!");
      setLocation(""); setIssueType(""); setDescription("");
      setImage(null); setPriority(2);
      loadComplaints();
      setActiveTab("complaints");
    } catch (err) {
      console.error(err);
      alert("Failed to submit complaint. Is the backend running?");
    }
    setSubmitting(false);
  };

  const logout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const statusColor = (s) => ({
    PENDING:     "#E8A96E",
    IN_PROGRESS: "#5B9BD5",
    REVIEW:      "#9B59B6",
    SOLVED:      "#2ECC71",
    ASSIGNED:    "#F39C12"
  })[s] || "#aaa";

  const priorityLabel = (p) => ({
    1: "🔴 Priority 1 — Critical",
    2: "🟡 Priority 2 — Medium",
    3: "🟢 Priority 3 — Low"
  })[p] || "Medium";

  const priorityColor = (p) => ({
    1: "#e74c3c",
    2: "#f39c12",
    3: "#2ecc71"
  })[p] || "#f39c12";

  const filteredComplaints = filterStatus === "ALL"
    ? complaints
    : complaints.filter(c => c.status === filterStatus);

  return (
    <div className="sd-page">
      {/* ── Sidebar ── */}
      <aside className="sd-sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-icon">🏛️</span>
          <span className="sidebar-title">CampusTrack</span>
        </div>
        <div className="sidebar-user">
          <div className="user-avatar">{user.username?.[0]?.toUpperCase()}</div>
          <div>
            <div className="user-name">{user.username}</div>
            <div className="user-role">{roleLabel}</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button className={activeTab === "submit" ? "nav-item active" : "nav-item"}
            onClick={() => setActiveTab("submit")}>
            📝 Submit Complaint
          </button>
          <button className={activeTab === "complaints" ? "nav-item active" : "nav-item"}
            onClick={() => setActiveTab("complaints")}>
            📋 My Complaints
            {complaints.length > 0 && (
              <span className="nav-badge">{complaints.length}</span>
            )}
          </button>
        </nav>
        <button className="logout-btn" onClick={logout}>⇤ Logout</button>
      </aside>

      {/* ── Main Content ── */}
      <main className="sd-main">
        <div className="sd-topbar">
          <h1 className="sd-heading">
            {activeTab === "submit" ? "Report an Issue" : "My Complaints"}
          </h1>
          <NotificationBell username={user.username} />
        </div>

        {/* ── SUBMIT TAB ── */}
        {activeTab === "submit" && (
          <div className="sd-card">
            <p className="section-hint">
              Upload or capture an image — our AI will auto-detect the issue type and description for you.
            </p>

            <div className="form-grid">
              <div className="form-left">
                <label className="field-label">📷 Image (Optional — AI Analysis)</label>
                <CameraCapture onDetect={handleDetect} />
              </div>

              <div className="form-right">
                <div className="field-group">
                  <label className="field-label">📍 Location <span className="required">*</span></label>
                  <input className="field-input" placeholder="e.g. CSE Block, Room 201"
                    value={location} onChange={e => setLocation(e.target.value)} />
                </div>

                <div className="field-group">
                  <label className="field-label">🔧 Issue Type <span className="required">*</span></label>
                  <input className="field-input" placeholder="e.g. Fan Not Working"
                    value={issueType} onChange={e => setIssueType(e.target.value)} />
                </div>

                <div className="field-group">
                  <label className="field-label">📝 Description <span className="required">*</span></label>
                  <textarea className="field-input field-textarea"
                    placeholder="Describe the issue in detail…"
                    value={description} onChange={e => setDescription(e.target.value)} rows={4} />
                </div>

                {/* ── Priority Selector ── */}
                <div className="field-group">
                  <label className="field-label">🚨 Priority Level <span className="required">*</span></label>
                  <div className="priority-selector">
                    {[1, 2, 3].map(p => (
                      <button
                        key={p}
                        type="button"
                        className={`priority-btn ${priority === p ? "selected" : ""}`}
                        style={{
                          borderColor: priority === p ? priorityColor(p) : "#ddd",
                          background:  priority === p ? priorityColor(p) : "white",
                          color:       priority === p ? "white" : "#555"
                        }}
                        onClick={() => setPriority(p)}
                      >
                        {p === 1 ? "🔴 P1 Critical" : p === 2 ? "🟡 P2 Medium" : "🟢 P3 Low"}
                      </button>
                    ))}
                  </div>
                </div>

                <button className="submit-btn" onClick={submitComplaint} disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit Complaint"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── COMPLAINTS TAB ── */}
        {activeTab === "complaints" && (
          <div className="sd-card">
            <div className="filter-row">
              {["ALL","PENDING","IN_PROGRESS","REVIEW","SOLVED"].map(s => (
                <button key={s}
                  className={filterStatus === s ? "filter-btn active" : "filter-btn"}
                  onClick={() => setFilterStatus(s)}>
                  {s === "ALL" ? "All" : s.replace("_"," ")}
                </button>
              ))}
            </div>

            {filteredComplaints.length === 0 ? (
              <div className="empty-state">
                <span>📭</span>
                <p>No complaints found.</p>
              </div>
            ) : (
              <div className="complaints-table-wrap">
                <table className="complaint-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Location</th>
                      <th>Issue</th>
                      <th>Description</th>
                      <th>Priority</th>
                      <th>Image</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComplaints.map((c, i) => (
                      <tr key={c.id}>
                        <td className="id-cell">{c.id}</td>
                        <td>{c.location}</td>
                        <td><strong>{c.issueType}</strong></td>
                        <td className="desc-cell">{c.description}</td>
                        <td>
                          <span className="priority-badge"
                            style={{ background: priorityColor(c.priority) }}>
                            {priorityLabel(c.priority)}
                          </span>
                        </td>
                        <td>
                          {c.image && (
                            <img src={c.image} alt="issue" className="table-img"
                              onClick={() => window.open(c.image)} title="Click to view full" />
                          )}
                        </td>
                        <td>
                          <span className="status-badge"
                            style={{ background: statusColor(c.status) }}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default StudentStaff;