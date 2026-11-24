
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useCart } from "../context/CartContext";
import { formatPrice } from "../components/ProductCard";
import { authApiRequest } from "../lib/api";

export default function CardPayment() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();

  const [order, setOrder] = useState(null);
  const [cardholder, setCardholder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  useEffect(() => {
    let active = true;

    authApiRequest(`/orders/${orderId}`)
      .then(data => {
        if (active) setOrder(data.order);
      })
      .catch(err => {
        if (active) setError(err.message || "Unable to load order.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [orderId]);

  function validateCardFormat() {
    const cleanNumber = cardNumber.replace(/\s/g, "");

    if (!/^\d{13,19}$/.test(cleanNumber)) {
      return "Please check the card number format.";
    }

    if (!cardholder.trim() || cardholder.trim().length < 2) {
      return "Please enter the cardholder name.";
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
      return "Please check the expiry date.";
    }

    const [monthText, yearText] = expiry.split("/");
    const month = Number(monthText);
    const year = 2000 + Number(yearText);

    const now = new Date();

    if (
      year < now.getFullYear() ||
      (year === now.getFullYear() && month < now.getMonth() + 1)
    ) {
      return "The expiry date has passed.";
    }

    if (!/^\d{3,4}$/.test(cvv)) {
      return "Please check the security code.";
    }

    return "";
  }

  function handleCardNumberChange(value) {
    const digits = value.replace(/\D/g, "").slice(0, 19);
    setCardNumber(digits.replace(/(.{4})/g, "$1 ").trim());
  }

  function handleExpiryChange(value) {
    const digits = value.replace(/\D/g, "").slice(0, 4);

    setExpiry(
      digits.length >= 3
        ? `${digits.slice(0, 2)}/${digits.slice(2)}`
        : digits
    );
  }

  async function simulatePayment(e) {
    e.preventDefault();
    setError("");

    const validationError = validateCardFormat();

    if (validationError) {
      setError(validationError);
      return;
    }

    setPaying(true);

    try {
      const data = await authApiRequest(
        `/orders/${orderId}/simulate-payment`,
        {
          method: "POST",
          body: JSON.stringify({
            confirm_simulation: true
          })
        }
      );

      setConfirmedOrder(data.order);
      clearCart();
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Unable to complete the payment.");
    } finally {
      setPaying(false);
    }
  }

  if (!orderId || !/^\d+$/.test(orderId)) {
    return (
      <div className="container py-5">
        <div className="alert alert-warning">
          Invalid order reference.
        </div>

        <Link to="/my-purchases" className="btn btn-dark">
          View my purchases
        </Link>
      </div>
    );
  }

  if (loading) {
    return <div className="container py-5">Loading order...</div>;
  }

  if (!order) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">
          {error || "Order not found."}
        </div>

        <Link to="/my-purchases" className="btn btn-dark">
          View my purchases
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="container py-5">
        <div className="success-panel">
          <div className="success-icon">
            <i className="bi bi-check-lg"></i>
          </div>

          <span className="eyebrow">
            ORDER CONFIRMED
          </span>

          <h1 className="section-title mt-2">
            Order successful
          </h1>

          <p className="text-muted">
            Your order has been confirmed.
          </p>

          {confirmedOrder && (
            <>
              <p>Order #{confirmedOrder.id}</p>

              <p>
                Total: {formatPrice(confirmedOrder.total_amount)}
              </p>

              <p>Status: {confirmedOrder.status}</p>

              {confirmedOrder.payment?.transaction_reference && (
                <p className="small text-muted">
                  Reference: {confirmedOrder.payment.transaction_reference}
                </p>
              )}
            </>
          )}

          <p className="small text-muted">
            Simulated transaction · No actual charge
          </p>

          <Link
            to="/my-purchases"
            className="btn btn-dark mt-3"
          >
            View my purchases
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="text-center mb-4">
        <span className="eyebrow">CHECKOUT</span>

        <h1 className="section-title mt-2">
          Card payment
        </h1>

        <p className="text-muted small">
          Complete payment for order #{orderId}
        </p>
      </div>

      <div className="row justify-content-center g-4">
        <div className="col-lg-7 col-xl-6">
          <div className="summary-card p-4 p-md-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h4 className="serif mb-1">
                  Payment details
                </h4>

                <p className="text-muted small mb-0">
                  Card information
                </p>
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-light text-dark border">
                  VISA
                </span>

                <span className="badge bg-light text-dark border">
                  Mastercard
                </span>
              </div>
            </div>

            <div className="rounded-3 p-3 mb-4 border bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <span className="small fw-semibold">
                  CARD PAYMENT
                </span>

                <i className="bi bi-credit-card-2-front fs-3"></i>
              </div>

              <div className="mt-4 mb-2 fs-4">
                <i className="bi bi-credit-card"></i>
              </div>

              <div className="small text-muted">
                Card payment details
              </div>
            </div>

            {error && (
              <div className="alert alert-danger py-2 small">
                <i className="bi bi-exclamation-circle me-2"></i>
                {error}
              </div>
            )}

            <form onSubmit={simulatePayment}>
              <div className="mb-3">
                <label htmlFor="cardholder" className="form-label fw-semibold small">
                  Cardholder name
                </label>

                <input
                  id="cardholder"
                  type="text"
                  className="form-control form-control-lg"
                  autoComplete="off"
                  maxLength={100}
                  value={cardholder}
                  onChange={e => setCardholder(e.target.value)}
                  placeholder="Name on card"
                  required
                />
              </div>

              <div className="mb-3">
                <label htmlFor="cardNumber" className="form-label fw-semibold small">
                  Card number
                </label>

                <input
                  id="cardNumber"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className="form-control form-control-lg"
                  value={cardNumber}
                  onChange={e => handleCardNumberChange(e.target.value)}
                  placeholder="1234 5678 9012 3456"
                  maxLength={23}
                  required
                />
              </div>

              <div className="row">
                <div className="col-6 mb-3">
                  <label htmlFor="expiry" className="form-label fw-semibold small">
                    Expiry date
                  </label>

                  <input
                    id="expiry"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    className="form-control form-control-lg"
                    value={expiry}
                    onChange={e => handleExpiryChange(e.target.value)}
                    placeholder="MM/YY"
                    maxLength={5}
                    required
                  />
                </div>

                <div className="col-6 mb-3">
                  <label htmlFor="cvv" className="form-label fw-semibold small">
                    Security code
                  </label>

                  <input
                    id="cvv"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    className="form-control form-control-lg"
                    value={cvv}
                    onChange={e =>
                      setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    placeholder="CVV"
                    maxLength={4}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-dark btn-lg w-100 mt-3"
                disabled={paying}
              >
                {paying ? "Processing..." : "Continue"}
              </button>

              <p className="small text-muted text-center mt-3 mb-0">
                
              </p>

              <Link
                to="/cart"
                className="btn btn-link text-muted w-100 mt-2 text-decoration-none"
              >
                <i className="bi bi-arrow-left me-1"></i>
                Back to cart
              </Link>
            </form>
          </div>
        </div>

        <div className="col-lg-5 col-xl-4">
          <div className="summary-card p-4">
            <h4 className="serif mb-4">
              Order summary
            </h4>

            <div className="d-flex justify-content-between mb-3">
              <span className="text-muted small">
                Order reference
              </span>

              <strong className="small">
                #{orderId}
              </strong>
            </div>

            <hr />

            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-semibold">
                Total
              </span>

              <span className="fs-4 fw-bold">
                {formatPrice(order.total_amount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
