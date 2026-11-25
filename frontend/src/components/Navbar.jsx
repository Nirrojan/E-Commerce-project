
import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { authApiRequest } from "../lib/api";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [notificationLoading, setNotificationLoading] = useState(false);

  async function loadNotifications() {
    try {
      const data = await authApiRequest("/notifications/");

      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  }

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    loadNotifications();

    const interval = setInterval(loadNotifications, 30000);

    return () => clearInterval(interval);
  }, [user]);

  async function toggleNotifications() {
    const nextState = !showNotifications;

    setShowNotifications(nextState);
    setSelectedNotification(null);

    if (nextState) {
      setNotificationLoading(true);
      await loadNotifications();
      setNotificationLoading(false);
    }
  }

  async function openNotification(notification) {
    setSelectedNotification(notification);

    if (!notification.is_read) {
      try {
        await authApiRequest(
          `/notifications/${notification.id}/read`,
          { method: "PATCH" }
        );

        setNotifications(previous =>
          previous.map(item =>
            item.id === notification.id
              ? { ...item, is_read: true }
              : item
          )
        );

        setUnreadCount(previous => Math.max(0, previous - 1));

        setSelectedNotification(previous =>
          previous
            ? { ...previous, is_read: true }
            : previous
        );
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }
  }

  async function deleteNotification(notificationId) {
    try {
      await authApiRequest(
        `/notifications/${notificationId}`,
        { method: "DELETE" }
      );

      const deletedNotification = notifications.find(
        item => item.id === notificationId
      );

      setNotifications(previous =>
        previous.filter(item => item.id !== notificationId)
      );

      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(previous => Math.max(0, previous - 1));
      }

      setSelectedNotification(null);
    } catch (error) {
      alert(error.message || "Unable to delete notification.");
    }
  }

  async function markAllAsRead() {
    try {
      await authApiRequest("/notifications/read-all", {
        method: "PATCH"
      });

      setNotifications(previous =>
        previous.map(item => ({ ...item, is_read: true }))
      );

      setUnreadCount(0);

      if (selectedNotification) {
        setSelectedNotification(previous => ({
          ...previous,
          is_read: true
        }));
      }
    } catch (error) {
      alert(error.message || "Unable to update notifications.");
    }
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="navbar navbar-expand-lg bg-white sticky-top border-bottom">
      <div className="container py-2">

        {/* Nirrojan Cosmetics Brand */}
        <Link
          className="navbar-brand brand"
          to={user ? "/home" : "/login"}
        >
          NIRROJAN <span>COSMETICS</span>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNav"
          aria-controls="mainNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="mainNav">

          {user && (
            <>
              <div className="navbar-nav mx-auto gap-lg-3">
                <NavLink className="nav-link" to="/about">
                  About
                </NavLink>

                <NavLink className="nav-link" to="/products">
                  Products
                </NavLink>

                <NavLink className="nav-link" to="/services">
                  Services
                </NavLink>
              </div>

              <div className="d-flex align-items-center gap-3 mt-3 mt-lg-0">

                {/* Notification dropdown */}
                <div className="position-relative">
                  <button
                    type="button"
                    className="btn nav-icon position-relative border-0"
                    onClick={toggleNotifications}
                    aria-label="Notifications"
                    title="Notifications"
                  >
                    <i className="bi bi-bell fs-5"></i>

                    {unreadCount > 0 && (
                      <span className="cart-count">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div
                      className="position-absolute end-0 mt-2 bg-white border rounded-3 shadow p-3"
                      style={{
                        width: "360px",
                        maxWidth: "90vw",
                        zIndex: 1100
                      }}
                    >
                      {!selectedNotification ? (
                        <>
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <strong>Notifications</strong>

                            <button
                              type="button"
                              className="btn btn-sm btn-light"
                              onClick={() => setShowNotifications(false)}
                              aria-label="Close notifications"
                            >
                              <i className="bi bi-x-lg"></i>
                            </button>
                          </div>

                          {unreadCount > 0 && (
                            <div className="text-end mb-2">
                              <button
                                className="btn btn-sm btn-link text-decoration-none"
                                onClick={markAllAsRead}
                              >
                                Mark all as read
                              </button>
                            </div>
                          )}

                          <div style={{ maxHeight: "350px", overflowY: "auto" }}>
                            {notificationLoading ? (
                              <p className="text-muted text-center py-3">
                                Loading notifications...
                              </p>
                            ) : notifications.length === 0 ? (
                              <div className="text-center text-muted py-4">
                                <i className="bi bi-bell-slash fs-2"></i>
                                <p className="mt-2 mb-0">
                                  No notifications yet.
                                </p>
                              </div>
                            ) : (
                              notifications.map(notification => (
                                <button
                                  type="button"
                                  key={notification.id}
                                  onClick={() => openNotification(notification)}
                                  className="w-100 text-start border-0 rounded-2 p-3 mb-2"
                                  style={{
                                    background: notification.is_read
                                      ? "#f8f9fa"
                                      : "#fff0f5"
                                  }}
                                >
                                  <div className="d-flex justify-content-between gap-2">
                                    <strong className="small">
                                      {notification.title}
                                    </strong>

                                    {!notification.is_read && (
                                      <span
                                        className="rounded-circle bg-danger flex-shrink-0"
                                        style={{
                                          width: "8px",
                                          height: "8px",
                                          marginTop: "5px"
                                        }}
                                      ></span>
                                    )}
                                  </div>

                                  <p className="small text-muted mb-1 mt-1">
                                    {notification.message}
                                  </p>

                                  <small className="text-secondary">
                                    {new Date(
                                      notification.created_at
                                    ).toLocaleString()}
                                  </small>
                                </button>
                              ))
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="d-flex align-items-center justify-content-between mb-3">
                            <button
                              type="button"
                              className="btn btn-sm btn-light"
                              onClick={() => setSelectedNotification(null)}
                            >
                              <i className="bi bi-arrow-left me-1"></i>
                              Back
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-light"
                              onClick={() => setShowNotifications(false)}
                              aria-label="Close notifications"
                            >
                              <i className="bi bi-x-lg"></i>
                            </button>
                          </div>

                          <h6 className="fw-bold">
                            {selectedNotification.title}
                          </h6>

                          <p className="text-muted small">
                            {new Date(
                              selectedNotification.created_at
                            ).toLocaleString()}
                          </p>

                          <p style={{ whiteSpace: "pre-wrap" }}>
                            {selectedNotification.message}
                          </p>

                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm w-100"
                            onClick={() =>
                              deleteNotification(selectedNotification.id)
                            }
                          >
                            <i className="bi bi-trash me-2"></i>
                            Delete notification
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Shopping cart */}
                <Link
                  to="/cart"
                  className="nav-icon position-relative"
                  aria-label="Shopping cart"
                >
                  <i className="bi bi-bag fs-5"></i>

                  {count > 0 && (
                    <span className="cart-count">
                      {count}
                    </span>
                  )}
                </Link>

                {/* Profile menu */}
                <div className="dropdown">
                  <button
                    className="btn profile-trigger dropdown-toggle"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    {user.picture ? (
                      <img
                        src={user.picture}
                        alt=""
                        className="avatar"
                      />
                    ) : (
                      <i className="bi bi-person-circle fs-4"></i>
                    )}

                    <span className="d-none d-md-inline">
                      {user.name.split(" ")[0]}
                    </span>
                  </button>

                  <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0">
                    <li>
                      <Link className="dropdown-item" to="/profile">
                        <i className="bi bi-person me-2"></i>
                        My profile
                      </Link>
                    </li>

                    <li>
                      <Link
                        className="dropdown-item"
                        to="/my-purchases"
                      >
                        <i className="bi bi-box-seam me-2"></i>
                        My purchases
                      </Link>
                    </li>

                    <li>
                      <Link
                        className="dropdown-item"
                        to="/booked-services"
                      >
                        <i className="bi bi-calendar-check me-2"></i>
                        Booked services
                      </Link>
                    </li>

                    <li>
                      <hr className="dropdown-divider" />
                    </li>

                    <li>
                      <button
                        className="dropdown-item text-danger"
                        onClick={handleLogout}
                      >
                        <i className="bi bi-box-arrow-right me-2"></i>
                        Logout
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </>
          )}

          {!user && (
            <div className="ms-auto d-flex gap-2 mt-3 mt-lg-0">
              <Link
                className="btn btn-outline-dark btn-sm px-3"
                to="/login"
              >
                Login
              </Link>

              <Link
                className="btn btn-dark btn-sm px-3"
                to="/register"
              >
                Create account
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
