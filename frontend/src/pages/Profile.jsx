
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const {
    user,
    updateProfile,
    uploadProfilePicture,
    changePassword
  } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  async function saveProfile(e) {
    e.preventDefault();

    setMessage("");
    setError("");
    setSaving(true);

    try {
      await updateProfile({ name });
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function imageChange(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    setMessage("");
    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      e.target.value = "";
      return;
    }

    if (file.size > 800 * 1024) {
      setError("Please choose an image smaller than 800 KB.");
      e.target.value = "";
      return;
    }

    setUploading(true);

    try {
      await uploadProfilePicture(file);
      setMessage("Profile picture uploaded successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function savePassword(e) {
    e.preventDefault();

    setMessage("");
    setError("");

    if (newPassword.length < 8) {
      setError("New password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setChangingPassword(true);

    try {
      const result = await changePassword(
        currentPassword,
        newPassword
      );

      setMessage(result.message);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="container py-5">
      <span className="eyebrow">YOUR ACCOUNT</span>

      <h1 className="section-title mt-2 mb-4">
        My profile
      </h1>

      <div className="form-panel">

        <div className="d-flex align-items-center gap-3 mb-4">
          {user?.picture ? (
            <img
              className="profile-large"
              src={user.picture}
              alt="Profile"
            />
          ) : (
            <div className="profile-placeholder">
              <i className="bi bi-person"></i>
            </div>
          )}

          <div>
            <strong>{user?.name}</strong>
            <div className="small text-muted">
              {user?.email}
            </div>
          </div>
        </div>

        {message && (
          <div className="alert alert-success py-2">
            {message}
          </div>
        )}

        {error && (
          <div className="alert alert-danger py-2">
            {error}
          </div>
        )}

        {/* PROFILE INFORMATION */}
        <form onSubmit={saveProfile}>
          <label className="form-label">
            Profile picture
          </label>

          <input
            type="file"
            className="form-control mb-3"
            accept="image/jpeg,image/png,image/webp"
            onChange={imageChange}
            disabled={uploading}
          />

          {uploading && (
            <p className="small text-muted">
              Uploading picture...
            </p>
          )}

          <label className="form-label">
            Full name
          </label>

          <input
            className="form-control mb-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label className="form-label">
            Email address
          </label>

          <input
            className="form-control mb-4"
            value={user?.email || ""}
            disabled
          />

          <button
            className="btn btn-dark"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save profile"}
          </button>
        </form>

        <hr className="my-4" />

        {/* CHANGE PASSWORD */}
        <h4 className="serif">
          Change password
        </h4>

        <p className="small text-muted">
          Enter your current password and choose a new password.
        </p>

        <form onSubmit={savePassword}>
          <label className="form-label">
            Current password
          </label>

          <input
            className="form-control mb-3"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <label className="form-label">
            New password
          </label>

          <input
            className="form-control mb-3"
            type="password"
            minLength="8"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <label className="form-label">
            Confirm new password
          </label>

          <input
            className="form-control mb-4"
            type="password"
            minLength="8"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <button
            className="btn btn-outline-dark"
            type="submit"
            disabled={changingPassword}
          >
            {changingPassword
              ? "Updating..."
              : "Update password"}
          </button>
        </form>

      </div>
    </div>
  );
}
