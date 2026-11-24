import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { publicApiRequest } from "../lib/api";
import { formatPrice } from "../components/ProductCard";
import { useCart } from "../context/CartContext";

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    publicApiRequest(`/products/${id}`)
      .then(setProduct)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="container py-5">Loading product...</div>;
  if (!product) return <div className="container py-5">{error || "Product not found."} <Link to="/products">Back to products</Link></div>;

  const cartProduct = {
    ...product,
    image: product.image_url,
  };

  function buy() {
    addToCart(cartProduct, qty);
    navigate("/checkout");
  }

  return (
    <div className="container py-5">
      <div className="mb-4 small text-muted">
        <Link to="/products">Products</Link> / {product.category} / {product.name}
      </div>
      <div className="row g-5 align-items-center">
        <div className="col-md-6">
          <img src={product.image_url} alt={product.name} className="detail-image" />
        </div>
        <div className="col-md-6">
          <span className="eyebrow">{product.category}</span>
          <h1 className="section-title mt-2">{product.name}</h1>
          <h3 className="my-3">{formatPrice(product.price)}</h3>
          <p className="text-muted">{product.description}</p>
          <p className="small text-muted">Available stock: {product.stock}</p>
          <div className="d-flex align-items-center gap-3 my-4">
            <span>Quantity</span>
            <div className="quantity-control">
              <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
              <span>{qty}</span>
              <button onClick={() => setQty(Math.min(product.stock || 1, qty + 1))}>+</button>
            </div>
          </div>
          <button className="btn btn-dark btn-lg me-2" disabled={!product.stock} onClick={buy}>Buy now</button>
          <button className="btn btn-outline-dark btn-lg" disabled={!product.stock}
            onClick={() => addToCart(cartProduct, qty)}>Add to bag</button>
        </div>
      </div>
    </div>
  );
}
