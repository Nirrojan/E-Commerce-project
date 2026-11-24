
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useCart } from "../context/CartContext";
import { formatPrice } from "../components/ProductCard";
import { authApiRequest } from "../lib/api";

export default function Payment() {
  const { items, total } = useCart();
  const navigate = useNavigate();

  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function continueToCardPayment(e) {
    e.preventDefault();
    setError("");

    if (!items.length) {
      setError("Your cart is empty.");
      return;
    }

    if (!address.trim()) {
      setError("Please enter your delivery address.");
      return;
    }

    setLoading(true);

    try {
      const data = await authApiRequest("/orders/", {
        method: "POST",
        body: JSON.stringify({
          shipping_address: address.trim(),
          items: items.map(item => ({
            product_id: item.id,
            quantity: item.quantity
          }))
        })
      });

      if (!data.order?.id) {
        throw new Error("Unable to create your pending order.");
      }

      navigate(`/card-payment/${data.order.id}`, {
        state: {
          order: data.order
        }
      });
    } catch (err) {
      setError(err.message || "Unable to continue to payment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-5">
      <span className="eyebrow">CHECKOUT</span>

      <h1 className="section-title mt-2 mb-4">
        Delivery details
      </h1>

      {!items.length ? (
        <div className="empty-state">
          Your cart is empty.{" "}
          <Link to="/products">Browse products</Link>
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-lg-7">
            <div className="summary-card">
              <h4 className="serif mb-3">
                Delivery address
              </h4>

              {error && (
                <div className="alert alert-danger">
                  {error}
                </div>
              )}

              <form onSubmit={continueToCardPayment}>
                <label
                  className="form-label"
                  htmlFor="shippingAddress"
                >
                  Full delivery address
                </label>

                <textarea
                  id="shippingAddress"
                  className="form-control mb-4"
                  rows="5"
                  required
                  maxLength={2000}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Enter your full delivery address"
                />

                <button
                  type="submit"
                  className="btn btn-dark btn-lg w-100"
                  disabled={loading}
                >
                  {loading
                    ? "Creating order..."
                    : "Continue to card payment"}
                </button>
              </form>
            </div>
          </div>

          <div className="col-lg-5">
            <div className="summary-card">
              <h4 className="serif">
                Order summary
              </h4>

              {items.map(item => (
                <div
                  className="d-flex justify-content-between small mt-3"
                  key={item.id}
                >
                  <span>
                    {item.name} × {item.quantity}
                  </span>

                  <span>
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}

              <hr />

              <div className="d-flex justify-content-between">
                <strong>Total</strong>
                <strong>{formatPrice(total)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
