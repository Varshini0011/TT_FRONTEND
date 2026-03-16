import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from "react-router-dom";
import './login.css';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:8080/users/login", formData);
      if (!res.data) { alert("Invalid email or password"); setLoading(false); return; }

      localStorage.setItem("user", JSON.stringify(res.data));
      const role = res.data.role?.toUpperCase();

      if (role === "ADMIN")                                    navigate("/admin");
      else if (role === "MAINTENANCE_WORKER" ||
               role === "WORKER" ||
               role === "MAINTAINANCE WORKER")                 navigate("/worker");
      else if (role === "STAFF" || role === "TEACHER")         navigate("/teacher");
      else                                                     navigate("/student");
    } catch (err) {
      console.error(err);
      alert("Login failed. Please check your credentials.");
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-brand">
        <div className="brand-icon">🏛️</div>
        <h1 className="brand-name">Campus<span>Track</span></h1>
        <p className="brand-tagline">Smart Infrastructure Issue Tracker</p>
      </div>

      <div className="login-card">
        <h2 className="login-title">Welcome Back</h2>
        <p className="login-subtitle">Sign in to your account</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label>Email Address</label>
            <input
              type="email" name="email"
              placeholder="you@college.edu"
              value={formData.email} onChange={handleChange} required
            />
          </div>

          <div className="field-group">
            <label>Password</label>
            <input
              type="password" name="password"
              placeholder="••••••••"
              value={formData.password} onChange={handleChange} required
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <Link to="/register" className="register-link">
          Don't have an account? <strong>Register</strong>
        </Link>
      </div>
    </div>
  );
}

export default Login;
