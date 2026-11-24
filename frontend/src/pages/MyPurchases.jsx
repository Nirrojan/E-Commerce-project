
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authApiRequest } from "../lib/api";
import { formatPrice } from "../components/ProductCard";

export default function MyPurchases() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    authApiRequest("/orders/")
      .then(data => setOrders(data.orders || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container py-5">
      <span className="eyebrow">YOUR ORDER HISTORY</span>

      <h1 className="section-title mt-2 mb-4">
        My purchases
      </h1>

      {loading && <p>Loading your purchases...</p>}

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="empty-state">
          <i className="bi bi-box-seam fs-1"></i>
          <h3 className="serif mt-3">No purchases yet</h3>
          <p className="text-muted">
            Your completed orders will appear here.
          </p>
          <Link to="/products" className="btn btn-dark">
            Explore products
          </Link>
        </div>
      )}

      {!loading && orders.map(order => (
        <div className="purchase-card mb-3" key={order.id}>
          <div className="d-flex flex-wrap justify-content-between gap-2">
            <div>
              <strong>Order #{order.id}</strong>
              <div className="small text-muted">
                {order.created_at
                  ? new Date(order.created_at).toLocaleString()
                  : ""}
              </div>
            </div>

            <span className="badge text-bg-success align-self-start">
              {order.status}
            </span>
          </div>

          <hr />

          {(order.items || []).map(item => (
            <div
              className="d-flex justify-content-between small mb-2"
              key={item.id}
            >
              <span>
                {item.product_name} × {item.quantity}
              </span>

              <span>
                {formatPrice(item.price * item.quantity)}
              </span>
            </div>
          ))}

          <hr />

          <div className="small text-muted mb-2">
            Delivery address: {order.shipping_address}
          </div>

          <div className="d-flex justify-content-between">
            <strong>Total</strong>
            <strong>{formatPrice(order.total_amount)}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}
