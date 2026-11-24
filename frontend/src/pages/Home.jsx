import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { publicApiRequest } from "../lib/api";

const fallbackCategories = [
  { name: "Creams", image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=700&q=80" },
  { name: "Face Washes", image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=700&q=80" },
  { name: "Lip Balms", image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=700&q=80" },
  { name: "Nail Polish", image: "https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=700&q=80" },
];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    Promise.all([publicApiRequest("/products/"), publicApiRequest("/categories/")])
      .then(([productData, categoryData]) => {
        setProducts(productData.slice(0, 4));
        setCategories(categoryData.map((category, index) => ({
          name: category.name,
          image: fallbackCategories[index % fallbackCategories.length]?.image,
        })));
      })
      .catch(() => {});
  }, []);

  const displayCategories = categories.length ? categories : fallbackCategories;

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">YOUR EVERYDAY BEAUTY EDIT</span>
            <h1>Make time for<br /><em>yourself.</em></h1>
            <p>Discover feel-good skincare and little beauty treats made for your everyday routine.</p>
            <Link to="/products" className="btn btn-dark btn-lg mt-2">Shop the collection <i className="bi bi-arrow-right ms-2"></i></Link>
          </div>
          <div className="hero-image">
            <img src="https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=1200&q=85" alt="Beauty skincare products" />
          </div>
        </div>
      </section>
      <section className="container py-5">
        <div className="section-heading">
          <div><span className="eyebrow">FIND YOUR FAVOURITES</span><h2 className="section-title">Shop by category</h2></div>
          <Link to="/products" className="text-link">View all products <i className="bi bi-arrow-up-right"></i></Link>
        </div>
        <div className="row g-3">
          {displayCategories.map((category) => (
            <div className="col-6 col-lg-3" key={category.name}>
              <Link to={`/products?category=${encodeURIComponent(category.name)}`} className="category-card">
                <img src={category.image} alt={category.name} /><span>{category.name}<i className="bi bi-arrow-up-right ms-2"></i></span>
              </Link>
            </div>
          ))}
        </div>
      </section>
      <section className="soft-section py-5">
        <div className="container">
          <div className="section-heading">
            <div><span className="eyebrow">LOVED BY OUR COMMUNITY</span><h2 className="section-title">A few feel-good picks</h2></div>
            <Link to="/products" className="text-link">Explore all</Link>
          </div>
          <div className="row g-4">
            {products.map((product) => <div className="col-6 col-lg-3" key={product.id}><ProductCard product={product} /></div>)}
          </div>
        </div>
      </section>
      <section className="container py-5">
        <div className="service-banner">
          <div><span className="eyebrow">A MOMENT JUST FOR YOU</span><h2 className="section-title">Make self-care a date.</h2><p>Explore our relaxing beauty and care services.</p><Link to="/services" className="btn btn-dark">Explore services</Link></div>
          <i className="bi bi-flower1"></i>
        </div>
      </section>
    </>
  );
}
