import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { publicApiRequest } from "../lib/api";

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    publicApiRequest("/services/")
      .then((data) => setServices(data.services || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container py-5 text-center">Loading services...</div>;
  if (error) return <div className="container py-5"><div className="alert alert-danger">{error}</div></div>;

  return (
    <div className="container py-5">
      <span className="eyebrow">A LITTLE TIME FOR YOU</span>
      <h1 className="section-title mt-2">Our services</h1>
      <p className="text-muted mb-5">Choose a treatment and book a time that suits you.</p>
      {!services.length ? <p className="text-muted">No services are currently available.</p> : (
        <div className="row g-4">
          {services.map((service) => (
            <div className="col-md-6 col-lg-4" key={service.id}>
              <div className="service-card h-100 p-0 overflow-hidden">
                {service.image_url ? <img src={service.image_url} alt={service.name} className="w-100" style={{ height: 230, objectFit: "cover" }} /> : null}
                <div className="p-4">
                  <h3 className="serif">{service.name}</h3>
                  <p className="text-muted">{service.description}</p>
                  <div className="d-flex justify-content-between border-top pt-3">
                    <span className="small text-muted"><i className="bi bi-clock me-1"></i>{service.duration || "Appointment"}</span>
                    <strong>{service.price !== null ? `LKR ${Number(service.price).toLocaleString("en-LK")}` : "Price to be confirmed"}</strong>
                  </div>
                  <Link to={`/services/${service.id}`} className="btn btn-outline-dark w-100 mt-3">View therapists & book</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
