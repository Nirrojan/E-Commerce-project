import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { authApiRequest, publicApiRequest } from "../lib/api";

function monthString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function BookAppointment() {
  const { serviceId, therapistId } = useParams();
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [availability, setAvailability] = useState([]);
  const [service, setService] = useState(null);
  const [therapist, setTherapist] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const month = monthString(monthDate);
  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([
      publicApiRequest(`/services/${serviceId}`),
      publicApiRequest(`/therapists/${therapistId}`),
      publicApiRequest(`/appointments/availability?service_id=${serviceId}&therapist_id=${therapistId}&month=${month}`),
    ])
      .then(([serviceData, therapistData, availabilityData]) => {
        setService(serviceData.service);
        setTherapist(therapistData.therapist);
        setAvailability(availabilityData.available_dates || []);
        setSelectedDate("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [serviceId, therapistId, month]);

  const selectedDay = useMemo(
    () => availability.find((day) => day.date === selectedDate),
    [availability, selectedDate]
  );

  function changeMonth(delta) {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  async function chooseSlot(slot) {
    setBooking(true);
    setError("");
    try {
      const data = await authApiRequest("/appointments/holds", {
        method: "POST",
        body: JSON.stringify({
          service_id: Number(serviceId),
          therapist_id: Number(therapistId),
          starts_at: slot.starts_at,
        }),
      });
      navigate(`/appointment-payment/${data.appointment.id}`);
    } catch (err) {
      setError(err.message);
      // Refresh availability in case another customer just took this slot.
      const refreshed = await publicApiRequest(`/appointments/availability?service_id=${serviceId}&therapist_id=${therapistId}&month=${month}`);
      setAvailability(refreshed.available_dates || []);
    } finally {
      setBooking(false);
    }
  }

  if (loading) return <div className="container py-5">Checking availability...</div>;
  if (error && !service) return <div className="container py-5"><div className="alert alert-danger">{error}</div></div>;

  return (
    <div className="container py-5">
      <Link to={`/therapists/${therapistId}?serviceId=${serviceId}`} className="text-dark"><i className="bi bi-arrow-left me-2"></i>Back to therapist</Link>
      <span className="eyebrow d-block mt-4">BOOK AN APPOINTMENT</span>
      <h1 className="section-title mt-2">{service?.name}</h1>
      <p className="text-muted">With {therapist?.name}. Each appointment slot is two hours.</p>
      {error && <div className="alert alert-warning">{error}</div>}
      <div className="booking-calendar mt-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <button className="btn btn-outline-dark" onClick={() => changeMonth(-1)} aria-label="Previous month">‹</button>
          <h4 className="serif mb-0">{monthDate.toLocaleDateString("en", { month: "long", year: "numeric" })}</h4>
          <button className="btn btn-outline-dark" onClick={() => changeMonth(1)} aria-label="Next month">›</button>
        </div>
        {!availability.length ? <div className="empty-state">No available appointment dates in this month.</div> : (
          <div className="row g-2">
            {availability.map((day) => (
              <div className="col-6 col-sm-4 col-md-3 col-lg-2" key={day.date}>
                <button className={`available-date w-100 ${selectedDate === day.date ? "active" : ""}`}
                  onClick={() => setSelectedDate(day.date)}>
                  <strong>{new Date(`${day.date}T00:00:00`).toLocaleDateString("en", { weekday: "short" })}</strong>
                  <span>{new Date(`${day.date}T00:00:00`).toLocaleDateString("en", { day: "numeric", month: "short" })}</span>
                  <small>{day.slots.length} slots</small>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {selectedDay && (
        <section className="mt-5">
          <h3 className="serif">Available times for {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en", { dateStyle: "long" })}</h3>
          <div className="d-flex flex-wrap gap-3 mt-3">
            {selectedDay.slots.map((slot) => (
              <button key={slot.starts_at} className="time-slot" disabled={booking} onClick={() => chooseSlot(slot)}>
                {slot.label}
              </button>
            ))}
          </div>
        </section>
      )}
      {booking && <p className="text-muted mt-3">Temporarily reserving your selected slot...</p>}
    </div>
  );
}
