import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { publicApiRequest } from "../lib/api";

export default function ServiceDetails() {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    publicApiRequest(`/services/${id}`)
      .then((data) => setService(data.service))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="container py-5 text-center">Loading service...</div>;
  if (error || !service) return <div className="container py-5"><div className="alert alert-danger">{error || "Service not found"}</div><Link to="/services">Back to services</Link></div>;

  return (
    <div className="container py-5">
      <Link to="/services" className="text-dark"><i className="bi bi-arrow-left me-2"></i>Back to services</Link>
      <div className="row g-5 mt-3 align-items-center">
        <div className="col-md-6">
          {service.image_url && <img src={service.image_url} alt={service.name} className="detail-image" />}
        </div>
        <div className="col-md-6">
          <span className="eyebrow">OUR BEAUTY SERVICES</span>
          <h1 className="section-title mt-3">{service.name}</h1>
          <p className="text-muted mt-4">{service.description}</p>
          <div className="border-top border-bottom py-3 my-4">
            <div className="d-flex justify-content-between mb-3"><span className="text-muted">Duration</span><strong>{service.duration || "Appointment"}</strong></div>
            <div className="d-flex justify-content-between"><span className="text-muted">Price</span><strong>{service.price !== null ? `LKR ${Number(service.price).toLocaleString("en-LK")}` : "Price to be confirmed"}</strong></div>
          </div>
          <p className="text-muted">Choose a therapist who provides this service, view their profile and select an available two-hour appointment slot.</p>
          <Link to={`/services/${service.id}/therapists`} className="btn btn-dark btn-lg w-100">Choose a therapist</Link>
        </div>
      </div>
    </div>
  );
}
