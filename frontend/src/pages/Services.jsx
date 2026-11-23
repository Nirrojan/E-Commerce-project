
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = "http://127.0.0.1:5000/api/services/";

export default function Services() {

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {

    async function fetchServices() {

      try {

        const response = await fetch(API_URL);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load services");
        }

        setServices(data.services || []);

      } catch (err) {

        setError(err.message);

      } finally {

        setLoading(false);

      }
    }

    fetchServices();

  }, []);


  if (loading) {
    return (
      <div className="container py-5 text-center">
        <p>Loading services...</p>
      </div>
    );
  }


  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">
          {error}
        </div>
      </div>
    );
  }


  return (

    <div className="container py-5">

      <span className="eyebrow">
        A LITTLE TIME FOR YOU
      </span>

      <h1 className="section-title mt-2">
        Our services
      </h1>

      <p className="text-muted mb-5">
        Take a pause and enjoy a little self-care.
      </p>


      {services.length === 0 ? (

        <p className="text-muted">
          No services are currently available.
        </p>

      ) : (

        <div className="row g-4">

          {services.map((service) => (

            <div
              className="col-md-6 col-lg-4"
              key={service.id}
            >

              <div className="service-card h-100">

                {service.image_url ? (

                  <img
                    src={service.image_url}
                    alt={service.name}
                    className="img-fluid w-100"
                    style={{
                      height: "230px",
                      objectFit: "cover"
                    }}
                  />

                ) : (

                  <div
                    className="d-flex align-items-center justify-content-center bg-light"
                    style={{ height: "230px" }}
                  >
                    <i className="bi bi-stars fs-1"></i>
                  </div>

                )}


                <div className="p-3">

                  <h3 className="serif mt-3">
                    {service.name}
                  </h3>

                  <p className="text-muted">
                    {service.description.length > 120
                      ? service.description.substring(0, 120) + "..."
                      : service.description}
                  </p>


                  <div className="d-flex justify-content-between border-top pt-3 mt-4">

                    <span className="small text-muted">

                      <i className="bi bi-clock me-1"></i>

                      {service.duration || "Contact us"}

                    </span>


                    <strong>

                      {service.price !== null
                        ? `LKR ${Number(service.price).toLocaleString("en-LK")}`
                        : "Contact us"}

                    </strong>

                  </div>


                  <Link
                    to={`/services/${service.id}`}
                    className="btn btn-outline-dark w-100 mt-3"
                  >
                    View Details
                  </Link>

                </div>

              </div>

            </div>

          ))}

        </div>

      )}

    </div>

  );
}
