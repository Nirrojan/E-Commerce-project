import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authApiRequest } from "../lib/api";

export default function AppointmentResult() {
  const [params] = useSearchParams();
  const appointmentId = params.get("appointment_id");
  const cancelled = params.get("cancelled") === "1";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!appointmentId) {
      setError("Appointment reference is missing.");
      setChecking(false);
      return undefined;
    }

    let attempts = 0;
    let timer;
    let active = true;

    const checkStatus = async () => {
      try {
        const result = await authApiRequest(`/appointments/${appointmentId}`);
        if (!active) return;
        setData(result);
        const status = result.payment?.status;
        if (status === "success" || status === "failed" || status === "late_success_review" || result.appointment.status === "confirmed") {
          setChecking(false);
          return;
        }
      } catch (err) {
        if (active) setError(err.message);
      }
      attempts += 1;
      if (attempts < 12 && active) {
        timer = setTimeout(checkStatus, 2500);
      } else if (active) {
        setChecking(false);
      }
    };

    checkStatus();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [appointmentId]);

  const paymentStatus = data?.payment?.status;
  const confirmed = data?.appointment?.status === "confirmed" && paymentStatus === "success";
  const review = false;
  const failed = paymentStatus === "failed" || data?.appointment?.status === "cancelled";

  return (
    <div className="container py-5">
      <div className="success-panel">
        <div className="success-icon"><i className={`bi ${confirmed ? "bi-check-lg" : "bi-clock"}`}></i></div>
        <span className="eyebrow">APPOINTMENT PAYMENT</span>
        <h1 className="section-title mt-2">
          {confirmed ? "Your appointment is confirmed" : review ? "Payment needs review" : failed ? "Payment was not completed" : cancelled ? "Payment was cancelled" : "Checking payment status"}
        </h1>
        {confirmed ? (
          <p className="text-muted">Your payment has been verified and your appointment is confirmed. A confirmation email will be sent shortly.</p>
        ) : review ? (
          <p className="text-muted">The selected appointment needs attention. Please contact the business.</p>
        ) : failed || cancelled ? (
          <p className="text-muted">The payment was not completed. Your temporary slot has been released or will expire automatically.</p>
        ) : (
          <p className="text-muted">{checking ? "Finishing your simulated payment confirmation." : "The booking has not been confirmed yet. Please refresh this page shortly."}</p>
        )}
        {error && <p className="text-danger small">{error}</p>}
        {data?.appointment && <p className="small text-muted">Booking reference: {data.appointment.id}</p>}
        <div className="d-flex justify-content-center gap-2 flex-wrap mt-4">
          <Link to="/profile" className="btn btn-dark">My account</Link>
          <Link to="/services" className="btn btn-outline-dark">Back to services</Link>
        </div>
      </div>
    </div>
  );
}
