import React from "react";
import { Link } from "react-router-dom";

export default function ProductCard({ product }) {
  const image = product.image_url || product.image;
  return (
    <div className="product-card h-100">
      <Link to={`/products/${product.id}`} className="product-image-wrap">
        {image && <img src={image} alt={product.name} className="product-image" />}
      </Link>
      <div className="p-3">
        <div className="small text-muted mb-1">{product.category || "Beauty"}</div>
        <Link to={`/products/${product.id}`} className="product-title">{product.name}</Link>
        <div className="d-flex justify-content-between align-items-center mt-2">
          <strong>{formatPrice(product.price)}</strong>
          <Link to={`/products/${product.id}`} className="quick-view" aria-label={`View ${product.name}`}>
            <i className="bi bi-arrow-up-right"></i>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function formatPrice(price) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency", currency: "LKR", maximumFractionDigits: 0,
  }).format(Number(price || 0));
}
