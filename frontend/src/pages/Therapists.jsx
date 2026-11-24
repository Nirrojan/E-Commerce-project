import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { publicApiRequest } from "../lib/api";

export default function Therapists() {
  const { serviceId } = useParams();
  const [service, setService] = useState(null);
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      publicApiRequest(`/services/${serviceId}`),
      publicApiRequest(`/therapists/by-service/${serviceId}`),
    ])
      .then(([serviceData, therapistData]) => {
        setService(serviceData.service);
        setTherapists(therapistData.therapists || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [serviceId]);

  if (loading) return <div className="container py-5">Loading therapists...</div>;
  if (error) return <div className="container py-5"><div className="alert alert-danger">{error}</div></div>;

  return (
    <div className="container py-5">
      <Link to={`/services/${serviceId}`} className="text-dark"><i className="bi bi-arrow-left me-2"></i>Back to service</Link>
      <span className="eyebrow d-block mt-4">MEET YOUR THERAPIST</span>
      <h1 className="section-title mt-2">{service?.name || "Choose a therapist"}</h1>
      <p className="text-muted mb-4">Choose a therapist to view their profile and appointment availability.</p>
      {!therapists.length ? <div className="empty-state">No therapists are currently assigned to this service.</div> : (
        <div className="row g-4">
          {therapists.map((therapist) => (
            <div className="col-sm-6 col-lg-4" key={therapist.id}>
              <div className="therapist-card h-100">
                <img src={therapist.photo_url || "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800"} alt={therapist.name} />
                <div className="p-4">
                  <h3 className="serif mb-1">{therapist.name}</h3>
                  <p className="text-muted mb-2">{therapist.title}</p>
                  <p className="small text-muted">{therapist.experience_years} years of experience</p>
                  <Link className="btn btn-outline-dark w-100" to={`/therapists/${therapist.id}?serviceId=${serviceId}`}>View profile</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
