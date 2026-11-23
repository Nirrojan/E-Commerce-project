import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  function handleLogout() { logout(); navigate("/login"); }
  return <nav className="navbar navbar-expand-lg bg-white sticky-top border-bottom">
    <div className="container py-2">
      <Link className="navbar-brand brand" to={user ? "/home" : "/login"}>blush <span>& bloom.</span></Link>
      <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation">
        <span className="navbar-toggler-icon"></span>
      </button>
      <div className="collapse navbar-collapse" id="mainNav">
        {user && <>
          <div className="navbar-nav mx-auto gap-lg-3">
            <NavLink className="nav-link" to="/about">About</NavLink>
            <NavLink className="nav-link" to="/products">Products</NavLink>
            <NavLink className="nav-link" to="/services">Services</NavLink>
          </div>
          <div className="d-flex align-items-center gap-3 mt-3 mt-lg-0">
            <Link to="/cart" className="nav-icon position-relative" aria-label="Shopping cart">
              <i className="bi bi-bag fs-5"></i>
              {count > 0 && <span className="cart-count">{count}</span>}
            </Link>
            <div className="dropdown">
              <button className="btn profile-trigger dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                {user.picture ? <img src={user.picture} alt="" className="avatar"/> : <i className="bi bi-person-circle fs-4"></i>}
                <span className="d-none d-md-inline">{user.name.split(" ")[0]}</span>
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0">
                <li><Link className="dropdown-item" to="/profile"><i className="bi bi-person me-2"></i>My profile</Link></li>
                <li><Link className="dropdown-item" to="/my-purchases"><i className="bi bi-box-seam me-2"></i>My purchases</Link></li>
                <li><hr className="dropdown-divider"/></li>
                <li><button className="dropdown-item text-danger" onClick={handleLogout}><i className="bi bi-box-arrow-right me-2"></i>Logout</button></li>
              </ul>
            </div>
          </div>
        </>}
        {!user && <div className="ms-auto d-flex gap-2 mt-3 mt-lg-0">
          <Link className="btn btn-outline-dark btn-sm px-3" to="/login">Login</Link>
          <Link className="btn btn-dark btn-sm px-3" to="/register">Create account</Link>
        </div>}
      </div>
    </div>
  </nav>;
}