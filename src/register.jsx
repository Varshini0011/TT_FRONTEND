import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './register.css';

function Register() {
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', role: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post("https://tt-backend-j73r.onrender.com/users/register", formData);
      alert("Registration Successful! You can now login.");
      setFormData({ username: '', email: '', password: '', role: '' });
    } catch (err) {
      console.error("Error:", err);
      if (err.response?.status === 400) {
        alert("User with this email already exists! Please login instead.");
      } else {
        alert("Registration Failed. Please try again.");
      }
    }
    setLoading(false);
  };

  return (
    <div className="register-container">
      <div className="register-brand">
        <div className="brand-icon">🏛️</div>
        <h1 className="brand-name">Campus<span>Track</span></h1>
        <p className="brand-tagline">Smart Infrastructure Issue Tracker</p>
      </div>

      <div className="register-card">
        <h2 className="register-title">Create Account</h2>
        <p className="register-subtitle">Join your college infrastructure system</p>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label>Full Name</label>
            <input type="text" name="username" placeholder="Your full name"
              value={formData.username} onChange={handleChange} required />
          </div>

          <div className="field-group">
            <label>Email Address</label>
            <input type="email" name="email" placeholder="you@college.edu"
              value={formData.email} onChange={handleChange} required />
          </div>

          <div className="field-group">
            <label>Password</label>
            <input type="password" name="password" placeholder="••••••••"
              value={formData.password} onChange={handleChange} required />
          </div>

          <div className="field-group">
            <label>Role</label>
            <select name="role" value={formData.role} onChange={handleChange} required>
              <option value="">Select your role</option>
              <option value="STUDENT">Student</option>
              <option value="STAFF">Teacher / Staff</option>
              <option value="ADMIN">Admin</option>
              <option value="MAINTENANCE_WORKER">Maintenance Worker</option>
            </select>
          </div>

          <button type="submit" className="register-btn" disabled={loading}>
            {loading ? "Creating Account…" : "Create Account"}
          </button>
        </form>

        <Link to="/" className="login-link">
          Already have an account? <strong>Sign In</strong>
        </Link>
      </div>
    </div>
  );
}

export default Register;