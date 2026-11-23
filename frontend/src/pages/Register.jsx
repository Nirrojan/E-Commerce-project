
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: ""
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  function change(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  }

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }

    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password
      });

      navigate("/home", { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-5">
      <div className="form-panel mx-auto">
        <span className="eyebrow">JOIN OUR COMMUNITY</span>

        <h1 className="section-title mt-2">
          Create your account
        </h1>

        <p className="text-muted mb-4">
          Your next favourite beauty ritual starts here.
        </p>

        {error && (
          <div className="alert alert-danger">{error}</div>
        )}

        <form onSubmit={submit}>
          <label className="form-label">Full name</label>
          <input
            className="form-control mb-3"
            name="name"
            required
            value={form.name}
            onChange={change}
          />

          <label className="form-label">Email address</label>
          <input
            className="form-control mb-3"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={change}
          />

          <label className="form-label">Password</label>
          <input
            className="form-control mb-3"
            name="password"
            type="password"
            minLength="8"
            required
            value={form.password}
            onChange={change}
          />

          <label className="form-label">Confirm password</label>
          <input
            className="form-control mb-4"
            name="confirm"
            type="password"
            required
            value={form.confirm}
            onChange={change}
          />

          <button
            className="btn btn-dark btn-lg w-100"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="small text-center mt-4 mb-0">
          Already registered?{" "}
          <Link className="text-link" to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
