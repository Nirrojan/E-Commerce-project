import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams, useParams } from "react-router-dom";
import { publicApiRequest } from "../lib/api";

export default function TherapistProfile() {
  const { therapistId } = useParams();
  const [params] = useSearchParams();
  const serviceId = params.get("serviceId");
  const [therapist, setTherapist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    publicApiRequest(`/therapists/${therapistId}`)
      .then((data) => setTherapist(data.therapist))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [therapistId]);

  if (loading) return <div className="container py-5">Loading therapist profile...</div>;
  if (error || !therapist) return <div className="container py-5"><div className="alert alert-danger">{error || "Therapist not found"}</div></div>;

  return (
    <div className="container py-5">
      <div className="row g-5 align-items-center">
        <div className="col-md-5">
          <img src={therapist.photo_url} alt={therapist.name} className="detail-image therapist-profile-image" />
        </div>
        <div className="col-md-7">
          <span className="eyebrow">THERAPIST PROFILE</span>
          <h1 className="section-title mt-2">{therapist.name}</h1>
          <h5 className="text-muted">{therapist.title}</h5>
          <p className="mt-4">{therapist.bio}</p>
          <p><strong>{therapist.experience_years} years</strong> of experience</p>
          <h6 className="mt-4">Services</h6>
          <div className="d-flex flex-wrap gap-2 mb-4">
            {(therapist.services || []).map((service) => <span className="badge text-bg-light border" key={service.id}>{service.name}</span>)}
          </div>
          <button className="btn btn-dark btn-lg" disabled={!serviceId}
            onClick={() => navigate(`/book/${serviceId}/${therapist.id}`)}>Book with {therapist.name}</button>
          {!serviceId && <p className="small text-danger mt-2">Please choose a service first.</p>}
          <div className="mt-3"><Link to={serviceId ? `/services/${serviceId}/therapists` : "/services"}>Back</Link></div>
        </div>
      </div>
    </div>
  );
}
