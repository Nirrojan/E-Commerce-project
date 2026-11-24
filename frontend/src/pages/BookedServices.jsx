
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authApiRequest } from "../lib/api";
import { formatPrice } from "../components/ProductCard";

const CANCELLATION_LIMIT = 24 * 60 * 60 * 1000;

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-LK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString("en-LK", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function BookedServices() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  async function loadAppointments() {
    try {
      setError("");

      const data = await authApiRequest("/appointments/mine");

      const now = Date.now();

      const upcoming = (data.appointments || []).filter(item => (
        item.status === "confirmed" &&
        new Date(item.starts_at).getTime() > now
      ));

      setAppointments(upcoming);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  async function cancelAppointment(appointment) {
    const refund = appointment.payment
      ? Number(appointment.payment.amount) * 0.75
      : 0;

    const confirmed = window.confirm(
      `Are you sure you want to cancel this appointment?\n\n` +
      `Service: ${appointment.service?.name || "Appointment"}\n` +
      `Refund amount: ${formatPrice(refund)} (75%)\n\n` +
      `The refund request will be submitted after cancellation.`
    );

    if (!confirmed) return;

    setCancellingId(appointment.id);
    setError("");
    setMessage("");

    try {
      const result = await authApiRequest(
        `/appointments/${appointment.id}/cancel`,
        { method: "POST" }
      );

      setMessage(result.message);

      // Refresh active appointments. Cancelled appointment disappears.
      await loadAppointments();

    } catch (err) {
      setError(err.message);
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="container py-5">
      <span className="eyebrow">YOUR APPOINTMENTS</span>

      <h1 className="section-title mt-2 mb-3">
        Booked services
      </h1>

      <p className="text-muted mb-4">
        View your upcoming confirmed beauty and wellness appointments.
      </p>

      {message && (
        <div className="alert alert-success">
          {message}
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {loading && <p>Loading your booked services...</p>}

      {!loading && !error && appointments.length === 0 && (
        <div className="empty-state">
          <i className="bi bi-calendar-check fs-1"></i>

          <h3 className="serif mt-3">
            No upcoming booked services
          </h3>

          <p className="text-muted">
            Your confirmed upcoming appointments will appear here.
          </p>

          <Link to="/services" className="btn btn-dark">
            Explore services
          </Link>
        </div>
      )}

      <div className="row g-4">
        {appointments.map(appointment => {
          const start = new Date(appointment.starts_at);
          const remaining = start.getTime() - Date.now();

          const canCancel = remaining > CANCELLATION_LIMIT;

          const payment = appointment.payment;
          const service = appointment.service;
          const therapist = appointment.therapist;

          return (
            <div className="col-12" key={appointment.id}>
              <div className="purchase-card">
                <div className="d-flex flex-wrap justify-content-between gap-2">
                  <div>
                    <span className="eyebrow">
                      CONFIRMED APPOINTMENT
                    </span>

                    <h3 className="serif mt-2 mb-1">
                      {service?.name || "Booked service"}
                    </h3>

                    <div className="small text-muted">
                      Appointment #{appointment.id}
                    </div>
                  </div>

                  <span className="badge text-bg-success align-self-start">
                    Confirmed
                  </span>
                </div>

                <hr />

                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="small text-muted">
                      Therapist
                    </div>

                    <strong>
                      {therapist?.name || "Not available"}
                    </strong>
                  </div>

                  <div className="col-md-6">
                    <div className="small text-muted">
                      Appointment date
                    </div>

                    <strong>{formatDate(appointment.starts_at)}</strong>
                  </div>

                  <div className="col-md-6">
                    <div className="small text-muted">
                      Appointment time
                    </div>

                    <strong>
                      {formatTime(appointment.starts_at)}
                      {" – "}
                      {formatTime(appointment.ends_at)}
                    </strong>
                  </div>

                  <div className="col-md-6">
                    <div className="small text-muted">
                      Payment amount
                    </div>

                    <strong>
                      {payment
                        ? formatPrice(payment.amount)
                        : "Payment details unavailable"}
                    </strong>
                  </div>
                </div>

                <hr />

                {canCancel ? (
                  <>
                    <p className="small text-muted">
                      You can cancel this appointment more than
                      24 hours before its start time. The refund
                      request is for 75% of the appointment payment.
                    </p>

                    <button
                      className="btn btn-outline-danger"
                      disabled={cancellingId === appointment.id}
                      onClick={() => cancelAppointment(appointment)}
                    >
                      {cancellingId === appointment.id
                        ? "Cancelling..."
                        : "Cancel appointment"}
                    </button>
                  </>
                ) : (
                  <div className="alert alert-warning mb-0">
                    Cancellation is unavailable within 24 hours
                    of the appointment.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
