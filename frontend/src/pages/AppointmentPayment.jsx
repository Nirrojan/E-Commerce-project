
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { authApiRequest } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const initialCard = {
  cardholder: "",
  cardNumber: "",
  expiry: "",
  cvv: "",
};

function onlyDigits(value) {
  return value.replace(/\D/g, "");
}

function validateCard(card) {
  const errors = {};
  const cardNumber = onlyDigits(card.cardNumber);
  const cvv = onlyDigits(card.cvv);
  const expiryMatch = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(card.expiry.trim());

  if (!card.cardholder.trim()) {
    errors.cardholder = "Enter the name printed on the card.";
  }

  if (!/^\d{16}$/.test(cardNumber)) {
    errors.cardNumber = "Enter exactly 16 digits.";
  }

  if (!expiryMatch) {
    errors.expiry = "Use MM/YY format.";
  } else {
    const month = Number(expiryMatch[1]);
    const year = 2000 + Number(expiryMatch[2]);
    const today = new Date();

    if (
      year < today.getFullYear() ||
      (year === today.getFullYear() && month < today.getMonth() + 1)
    ) {
      errors.expiry = "The expiry date must be in the future.";
    }
  }

  if (!/^\d{3}$/.test(cvv)) {
    errors.cvv = "Enter exactly 3 digits.";
  }

  return errors;
}

export default function AppointmentPayment() {
  const { appointmentId } = useParams();
  const { user } = useAuth();

  const [appointment, setAppointment] = useState(null);
  const [card, setCard] = useState(initialCard);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    authApiRequest(`/appointments/${appointmentId}`)
      .then((data) => {
        if (active) setAppointment(data.appointment);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [appointmentId]);

  const formattedCardNumber = useMemo(() => {
    const digits = onlyDigits(card.cardNumber).slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  }, [card.cardNumber]);

  function updateCard(field, value) {
    setCard((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: "" }));
  }

  function updateExpiry(value) {
    const digits = onlyDigits(value).slice(0, 4);

    const formatted = digits.length > 2
      ? `${digits.slice(0, 2)}/${digits.slice(2)}`
      : digits;

    updateCard("expiry", formatted);
  }

  async function submitDemoPayment(event) {
    event.preventDefault();
    setError("");

    const errors = validateCard(card);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) return;

    setPaying(true);

    try {
      const result = await authApiRequest(
        `/payments/appointments/${appointmentId}/simulate`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      navigate(`/appointment-result?appointment_id=${result.appointment_id}`);
    } catch (err) {
      setError(err.message);
      setPaying(false);
    }
  }

  if (loading) {
    return <div className="container py-5">Loading booking...</div>;
  }

  if (!appointment) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">
          {error || "Booking not found"}
        </div>
        <Link to="/services">Back to services</Link>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <span className="eyebrow">CHECKOUT</span>

      <h1 className="section-title mt-2">
        Complete your booking
      </h1>

      <div className="row g-4 mt-2">
        <div className="col-lg-5">
          <div className="summary-card h-100">
            <h4 className="serif">Appointment summary</h4>

            <p className="mb-1">
              <strong>{appointment.service?.name}</strong>
            </p>

            <p className="text-muted mb-1">
              Therapist: {appointment.therapist?.name}
            </p>

            <p className="text-muted mb-1">
              Date: {new Date(appointment.starts_at).toLocaleDateString()}
            </p>

            <p className="text-muted mb-1">
              Time: {new Date(appointment.starts_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
              })}
            </p>

            <p className="text-muted">
              Slot length: 2 hours
            </p>

            <h4 className="mt-4">
              LKR {Number(appointment.service?.price || 0).toLocaleString("en-LK")}
            </h4>

            <p className="small text-muted">
              Your slot is held for 15 minutes while you complete checkout.
            </p>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="form-panel w-100">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h4 className="serif mb-1">Card details</h4>
                <p className="small text-muted mb-0">
                  Signed in as {user?.email}
                </p>
              </div>

              <div className="d-flex gap-2">
                <span className="badge bg-light text-dark border">VISA</span>
                <span className="badge bg-light text-dark border">Mastercard</span>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger">{error}</div>
            )}

            <form onSubmit={submitDemoPayment} noValidate>
              <label className="form-label" htmlFor="cardholder">
                Cardholder name
              </label>

              <input
                id="cardholder"
                className={`form-control mb-1 ${fieldErrors.cardholder ? "is-invalid" : ""}`}
                autoComplete="off"
                value={card.cardholder}
                onChange={(e) => updateCard("cardholder", e.target.value)}
                maxLength={100}
              />

              {fieldErrors.cardholder && (
                <div className="invalid-feedback d-block mb-2">
                  {fieldErrors.cardholder}
                </div>
              )}

              <label className="form-label mt-3" htmlFor="card-number">
                Card number
              </label>

              <input
                id="card-number"
                className={`form-control mb-1 ${fieldErrors.cardNumber ? "is-invalid" : ""}`}
                inputMode="numeric"
                autoComplete="off"
                placeholder="1234 5678 9012 3456"
                value={formattedCardNumber}
                onChange={(e) => updateCard("cardNumber", e.target.value)}
                maxLength={19}
              />

              {fieldErrors.cardNumber && (
                <div className="invalid-feedback d-block mb-2">
                  {fieldErrors.cardNumber}
                </div>
              )}

              <div className="row mt-3">
                <div className="col-sm-6">
                  <label className="form-label" htmlFor="expiry">
                    Expiry date
                  </label>

                  <input
                    id="expiry"
                    className={`form-control ${fieldErrors.expiry ? "is-invalid" : ""}`}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="MM/YY"
                    value={card.expiry}
                    onChange={(e) => updateExpiry(e.target.value)}
                    maxLength={5}
                  />

                  {fieldErrors.expiry && (
                    <div className="invalid-feedback d-block">
                      {fieldErrors.expiry}
                    </div>
                  )}
                </div>

                <div className="col-sm-6">
                  <label className="form-label" htmlFor="cvv">
                    Security code
                  </label>

                  <input
                    id="cvv"
                    className={`form-control ${fieldErrors.cvv ? "is-invalid" : ""}`}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="CVV"
                    type="password"
                    value={card.cvv}
                    onChange={(e) =>
                      updateCard("cvv", onlyDigits(e.target.value).slice(0, 3))
                    }
                    maxLength={3}
                  />

                  {fieldErrors.cvv && (
                    <div className="invalid-feedback d-block">
                      {fieldErrors.cvv}
                    </div>
                  )}
                </div>
              </div>

              <button
                className="btn btn-dark btn-lg w-100 mt-4"
                type="submit"
                disabled={paying}
              >
                {paying ? "Processing..." : "Continue"}
              </button>

              <p className="small text-muted text-center mt-3 mb-0">
                
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
