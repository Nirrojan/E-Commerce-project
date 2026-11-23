
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";


const API_URL = "http://127.0.0.1:5000/api/services";

// IMPORTANT: Replace this with your real business phone number.
// Sri Lankan format: 947XXXXXXXX
// Do not include + or spaces.
const BUSINESS_PHONE = "94758596665";


export default function ServiceDetails() {

  const { id } = useParams();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  useEffect(() => {

    async function fetchService() {

      try {

        const response = await fetch(`${API_URL}/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Service not found");
        }

        setService(data.service);

      } catch (err) {

        setError(err.message);

      } finally {

        setLoading(false);

      }
    }

    fetchService();

  }, [id]);


  if (loading) {
    return (
      <div className="container py-5 text-center">
        Loading service details...
      </div>
    );
  }


  if (error || !service) {
    return (
      <div className="container py-5">

        <div className="alert alert-danger">
          {error || "Service not found"}
        </div>

        <Link to="/services" className="btn btn-outline-dark">
          Back to Services
        </Link>

      </div>
    );
  }


  const message = encodeURIComponent(
    `Hello, I would like to enquire about ${service.name}. Please let me know the available appointment time slots and prices.`
  );

  const whatsappUrl =
    `https://wa.me/${BUSINESS_PHONE}?text=${message}`;

  const phoneUrl =
    `tel:+${BUSINESS_PHONE}`;


  return (

    <div className="container py-5">

      <Link
        to="/services"
        className="text-decoration-none text-dark"
      >
        <i className="bi bi-arrow-left me-2"></i>
        Back to Services
      </Link>


      <div className="row g-5 mt-3 align-items-center">

        <div className="col-md-6">

          {service.image_url && (

            <img
              src={service.image_url}
              alt={service.name}
              className="img-fluid w-100 rounded"
              style={{
                maxHeight: "500px",
                objectFit: "cover"
              }}
            />

          )}

        </div>


        <div className="col-md-6">

          <span className="eyebrow">
            OUR BEAUTY SERVICES
          </span>

          <h1 className="section-title mt-3">
            {service.name}
          </h1>

          <p className="text-muted mt-4">
            {service.description}
          </p>


          <div className="border-top border-bottom py-3 my-4">

            <div className="d-flex justify-content-between mb-3">

              <span className="text-muted">
                <i className="bi bi-clock me-2"></i>
                Duration
              </span>

              <strong>
                {service.duration || "Contact us"}
              </strong>

            </div>


            <div className="d-flex justify-content-between">

              <span className="text-muted">
                Price
              </span>

              <strong>
                {service.price !== null
                  ? `LKR ${Number(service.price).toLocaleString("en-LK")}`
                  : "Contact us for pricing"}
              </strong>

            </div>

          </div>


          <h5 className="serif mb-3">
            Enquire about this service
          </h5>

          <p className="text-muted">
            Contact us directly to ask about prices and available appointment time slots.
          </p>


          <div className="d-grid gap-3">

            <a
              href={phoneUrl}
              className="btn btn-dark btn-lg"
            >
              <i className="bi bi-telephone-fill me-2"></i>
              Call Us
            </a>


            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-success btn-lg"
            >
              <i className="bi bi-whatsapp me-2"></i>
              Enquire on WhatsApp
            </a>

          </div>

        </div>

      </div>

    </div>

  );
}
