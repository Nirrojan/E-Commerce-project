import React from "react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { products } from "../data/products";
import { formatPrice } from "../components/ProductCard";
import { useCart } from "../context/CartContext";
export default function ProductDetails(){
 const {id}=useParams();const product=products.find(p=>p.id===Number(id));const [qty,setQty]=useState(1);const {addToCart}=useCart();const navigate=useNavigate();
 if(!product)return <div className="container py-5">Product not found. <Link to="/products">Back to products</Link></div>;
 function buy(){addToCart(product,qty);navigate("/checkout");}
 return <div className="container py-5"><div className="mb-4 small text-muted"><Link to="/products">Products</Link> / {product.category} / {product.name}</div><div className="row g-5 align-items-center"><div className="col-md-6"><img src={product.image} alt={product.name} className="detail-image"/></div><div className="col-md-6"><span className="eyebrow">{product.category}</span><h1 className="section-title mt-2">{product.name}</h1><h3 className="my-3">{formatPrice(product.price)}</h3><p className="text-muted">{product.description}</p><div className="d-flex align-items-center gap-3 my-4"><span>Quantity</span><div className="quantity-control"><button onClick={()=>setQty(Math.max(1,qty-1))}>−</button><span>{qty}</span><button onClick={()=>setQty(qty+1)}>+</button></div></div><button className="btn btn-dark btn-lg me-2" onClick={buy}>Buy now</button><button className="btn btn-outline-dark btn-lg" onClick={()=>addToCart(product,qty)}>Add to bag</button><p className="small text-muted mt-3"><i className="bi bi-truck me-2"></i>Delivery options shown at checkout.</p></div></div></div>;
}