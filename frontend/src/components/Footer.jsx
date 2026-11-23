import React from "react";
export default function Footer() {
  return <footer className="footer mt-5">
    <div className="container py-4 d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
      <div className="brand">blush <span>& bloom.</span></div>
      <p className="mb-0 small text-muted">A little care, a little confidence. © {new Date().getFullYear()} Blush & Bloom.</p>
    </div>
  </footer>;
}