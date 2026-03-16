import { useState, useEffect, useRef } from "react";
import API from "./api";
import "./Notifications.css";

function NotificationBell({ username }) {
  const [notifications, setNotifications] = useState([]);
  const [count,         setCount]         = useState(0);
  const [open,          setOpen]          = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    if (!username) return;
    fetchNotifications();
    // Poll every 15 s for new notifications
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [username]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchNotifications = () => {
    API.get(`/notifications/${username}`)
      .then(res => {
        setNotifications(res.data);
        setCount(res.data.filter(n => !n.read).length);
      })
      .catch(() => {});
  };

  const markAllRead = () => {
    API.put(`/notifications/${username}/read-all`)
      .then(() => { setCount(0); fetchNotifications(); })
      .catch(() => {});
  };

  const toggleOpen = () => {
    setOpen(prev => !prev);
    if (!open && count > 0) markAllRead();
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="notif-wrap" ref={dropRef}>
      <button className="bell-btn" onClick={toggleOpen}>
        🔔
        {count > 0 && <span className="bell-count">{count > 9 ? "9+" : count}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <span>Notifications</span>
            {notifications.length > 0 && (
              <button className="mark-all" onClick={markAllRead}>Mark all read</button>
            )}
          </div>
          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">No notifications yet</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`notif-item ${n.read ? "read" : "unread"}`}>
                  <div className="notif-msg">{n.message}</div>
                  <div className="notif-time">{timeAgo(n.createdAt)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
