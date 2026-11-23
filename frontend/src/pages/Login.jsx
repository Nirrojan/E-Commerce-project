
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page container py-5">
      <div className="auth-card row g-0 mx-auto">
        <div className="col-md-5 auth-photo">
          <div>
            <span className="eyebrow">WELCOME TO YOUR HAPPY PLACE</span>
            <h1>Feel good.<br />Look after you.</h1>
            <p>Thoughtful beauty essentials for everyday rituals.</p>
          </div>
        </div>

        <div className="col-md-7 p-4 p-lg-5">
          <span className="eyebrow">YOUR ACCOUNT</span>
          <h2 className="section-title mt-2">Welcome back</h2>
          <p className="text-muted mb-4">
            Sign in to explore our beauty collection.
          </p>

          {error && (
            <div className="alert alert-danger py-2">{error}</div>
          )}

          <form onSubmit={submit}>
            <label className="form-label">Email address</label>
            <input
              className="form-control form-control-lg mb-3"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />

            <label className="form-label">Password</label>
            <input
              className="form-control form-control-lg mb-4"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />

            <button
              className="btn btn-dark btn-lg w-100"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
              {!loading && (
                <i className="bi bi-arrow-right ms-2"></i>
              )}
            </button>
          </form>

          <p className="small text-center mt-4 mb-0">
            New here?{" "}
            <Link to="/register" className="text-link">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
