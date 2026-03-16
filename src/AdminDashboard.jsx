import { useState, useEffect } from "react";
import API from "./api";
import "./AdminDashboard.css";
import NotificationBell from "./Notifications";
import { useNavigate } from "react-router-dom";

function AdminDashboard() {
  const [complaints, setComplaints]  = useState([]);
  const [workers,    setWorkers]     = useState([]);
  const [activeTab,  setActiveTab]   = useState("all");
  const [filterStatus, setFilter]    = useState("ALL");
  const [stats, setStats]            = useState({});

  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    loadComplaints();
    loadWorkers();
  }, []);

  const loadComplaints = () => {
    API.get("/complaints").then(res => {
      const data = res.data;
      setComplaints(data);
      // compute stats
      setStats({
        total:       data.length,
        pending:     data.filter(c => c.status === "PENDING").length,
        inProgress:  data.filter(c => c.status === "IN_PROGRESS" || c.status === "ASSIGNED").length,
        review:      data.filter(c => c.status === "REVIEW").length,
        solved:      data.filter(c => c.status === "SOLVED").length,
      });
    });
  };

  const loadWorkers = () => {
    API.get("/users/workers").then(res => setWorkers(res.data));
  };

  const assignWorker = (complaintId, workerId) => {
    if (!workerId) return;
    API.put(`/assign-worker/${complaintId}?workerId=${workerId}`)
      .then(() => { alert("Worker assigned!"); loadComplaints(); })
      .catch(() => alert("Failed to assign worker."));
  };

  const verifyComplaint = (id) => {
    API.put(`/api/admin/verify-complaint/${id}`)
      .then(() => { alert("Complaint marked as SOLVED!"); loadComplaints(); })
      .catch(() => alert("Verification failed."));
  };

  const logout = () => { localStorage.removeItem("user"); navigate("/"); };

  const statusColor = (s) => ({
    PENDING:     "#E8A96E",
    IN_PROGRESS: "#5B9BD5",
    ASSIGNED:    "#F39C12",
    REVIEW:      "#9B59B6",
    SOLVED:      "#2ECC71",
  })[s] || "#aaa";

  const filtered = filterStatus === "ALL"
    ? complaints
    : complaints.filter(c => c.status === filterStatus);

  return (
    <div className="admin-page">
      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <span>🏛️</span>
          <span className="sb-title">CampusTrack</span>
        </div>
        <div className="sidebar-user">
          <div className="user-avatar">{user.username?.[0]?.toUpperCase()}</div>
          <div>
            <div className="user-name">{user.username}</div>
            <div className="user-role">Administrator</div>
          </div>
        </div>
        <nav className="admin-nav">
          {[
            { key: "all",      label: "📊 All Complaints" },
            { key: "pending",  label: "⏳ Pending" },
            { key: "review",   label: "🔍 In Review" },
            { key: "workers",  label: "👷 Workers" },
          ].map(t => (
            <button key={t.key}
              className={activeTab === t.key ? "nav-item active" : "nav-item"}
              onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </nav>
        <button className="logout-btn" onClick={logout}>⇤ Logout</button>
      </aside>

      {/* ── Main ── */}
      <main className="admin-main">
        <div className="admin-topbar">
          <h1 className="admin-heading">
            {activeTab === "all"     && "All Complaints"}
            {activeTab === "pending" && "Pending Complaints"}
            {activeTab === "review"  && "Complaints In Review"}
            {activeTab === "workers" && "Maintenance Workers"}
          </h1>
          <NotificationBell username={user.username} />
        </div>

        {/* ── Stats Row ── */}
        {(activeTab === "all" || activeTab === "pending") && (
          <div className="stats-row">
            {[
              { label: "Total",       value: stats.total,      color: "#8B5E3C" },
              { label: "Pending",     value: stats.pending,    color: "#E8A96E" },
              { label: "In Progress", value: stats.inProgress, color: "#5B9BD5" },
              { label: "In Review",   value: stats.review,     color: "#9B59B6" },
              { label: "Solved",      value: stats.solved,     color: "#2ECC71" },
            ].map(s => (
              <div className="stat-card" key={s.label} style={{ borderTop: `4px solid ${s.color}` }}>
                <div className="stat-value" style={{ color: s.color }}>{s.value ?? 0}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── ALL / PENDING TAB ── */}
        {(activeTab === "all" || activeTab === "pending") && (
          <div className="admin-card">
            <div className="filter-row">
              {(activeTab === "all"
                ? ["ALL","PENDING","IN_PROGRESS","ASSIGNED","REVIEW","SOLVED"]
                : ["PENDING"]
              ).map(s => (
                <button key={s}
                  className={filterStatus === s ? "filter-btn active" : "filter-btn"}
                  onClick={() => setFilter(s)}>
                  {s === "ALL" ? "All" : s.replace("_"," ")}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state"><span>📭</span><p>No complaints found.</p></div>
            ) : (
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Raised By</th>
                      <th>Location</th>
                      <th>Issue Type</th>
                      <th>Description</th>
                      <th>Image</th>
                      <th>Status</th>
                      <th>Assign Worker</th>
                      <th>Proof</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(c => (
                      <tr key={c.id}>
                        <td className="id-cell">{c.id}</td>
                        <td><strong>{c.raisedByName || c.raisedBy}</strong></td>
                        <td>{c.location}</td>
                        <td>{c.issueType}</td>
                        <td className="desc-cell">{c.description}</td>
                        <td>
                          {c.image && (
                            <img src={c.image} alt="issue" className="table-img"
                              onClick={() => window.open(c.image)} />
                          )}
                        </td>
                        <td>
                          <span className="status-badge" style={{ background: statusColor(c.status) }}>
                            {c.status}
                          </span>
                        </td>
                        <td>
                          {c.status !== "SOLVED" && (
                            <div className="assign-wrap">
                              <select className="assign-select"
                                defaultValue={c.assignedWorker || ""}
                                onChange={e => assignWorker(c.id, e.target.value)}>
                                <option value="">Assign…</option>
                                {workers.map(w => (
                                  <option key={w.id} value={w.id}>{w.username}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          {c.assignedWorkerName && (
                            <span className="assigned-name">👷 {c.assignedWorkerName}</span>
                          )}
                        </td>
                        <td>
                          {c.reviewImage && (
                            <img src={c.reviewImage} alt="proof" className="table-img"
                              onClick={() => window.open(c.reviewImage)} title="Worker proof" />
                          )}
                        </td>
                        <td>
                          {c.status === "REVIEW" && (
                            <button className="verify-btn" onClick={() => verifyComplaint(c.id)}>
                              ✓ Verify
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── REVIEW TAB ── */}
        {activeTab === "review" && (
          <div className="admin-card">
            <p className="section-hint">
              Complaints marked as REVIEW by workers — check the proof image and verify or reject.
            </p>
            {complaints.filter(c => c.status === "REVIEW").length === 0 ? (
              <div className="empty-state"><span>✅</span><p>No complaints awaiting review.</p></div>
            ) : (
              <div className="review-grid">
                {complaints.filter(c => c.status === "REVIEW").map(c => (
                  <div className="review-card" key={c.id}>
                    <div className="review-header">
                      <span className="review-id">#{c.id}</span>
                      <span className="status-badge" style={{ background: "#9B59B6" }}>REVIEW</span>
                    </div>
                    <div className="review-body">
                      <p><strong>Raised By:</strong> {c.raisedByName || c.raisedBy}</p>
                      <p><strong>Location:</strong>  {c.location}</p>
                      <p><strong>Issue:</strong>     {c.issueType}</p>
                      <p><strong>Description:</strong> {c.description}</p>
                      {c.assignedWorkerName && (
                        <p><strong>Worker:</strong> 👷 {c.assignedWorkerName}</p>
                      )}
                    </div>
                    <div className="review-images">
                      {c.image && (
                        <div className="img-box">
                          <p className="img-label">Issue Photo</p>
                          <img src={c.image} alt="issue" onClick={() => window.open(c.image)} />
                        </div>
                      )}
                      {c.reviewImage && (
                        <div className="img-box">
                          <p className="img-label">Proof Photo</p>
                          <img src={c.reviewImage} alt="proof" onClick={() => window.open(c.reviewImage)} />
                        </div>
                      )}
                    </div>
                    <button className="verify-btn full" onClick={() => verifyComplaint(c.id)}>
                      ✓ Mark as Solved
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── WORKERS TAB ── */}
        {activeTab === "workers" && (
          <div className="admin-card">
            <p className="section-hint">All registered maintenance workers.</p>
            {workers.length === 0 ? (
              <div className="empty-state"><span>👷</span><p>No workers registered yet.</p></div>
            ) : (
              <div className="workers-grid">
                {workers.map(w => {
                  const wComplaints = complaints.filter(c => c.assignedWorker === w.id);
                  const solved      = wComplaints.filter(c => c.status === "SOLVED").length;
                  return (
                    <div className="worker-card" key={w.id}>
                      <div className="worker-avatar">{w.username?.[0]?.toUpperCase()}</div>
                      <div className="worker-info">
                        <div className="worker-name">{w.username}</div>
                        <div className="worker-email">{w.email}</div>
                        <div className="worker-stats">
                          <span>📋 {wComplaints.length} assigned</span>
                          <span>✅ {solved} solved</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
