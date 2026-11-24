import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { publicApiRequest } from "../lib/api";

export default function Products() {
  const [params] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState(params.get("category") || "All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      publicApiRequest("/products/"),
      publicApiRequest("/categories/"),
    ])
      .then(([productData, categoryData]) => {
        setProducts(productData);
        setCategories(categoryData.map((item) => item.name));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => products.filter((product) => {
    const matchesCategory = category === "All" || product.category === category;
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  }), [products, category, search]);

  if (loading) return <div className="container py-5 text-center">Loading products...</div>;
  if (error) return <div className="container py-5"><div className="alert alert-danger">{error}</div></div>;

  return (
    <div className="container py-5">
      <span className="eyebrow">THE BEAUTY EDIT</span>
      <h1 className="section-title mt-2">Our products</h1>
      <p className="text-muted">Little essentials for your everyday routine.</p>
      <div className="row align-items-center g-3 my-3">
        <div className="col-lg-8">
          <div className="filter-pills">
            {["All", ...categories].map((item) => (
              <button key={item} onClick={() => setCategory(item)}
                className={`filter-pill ${category === item ? "active" : ""}`}>
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="col-lg-4">
          <input className="form-control" placeholder="Search products..."
            value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>
      {filtered.length ? (
        <div className="row g-4">
          {filtered.map((product) => (
            <div className="col-6 col-lg-3" key={product.id}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : <div className="empty-state">No products found. Try another search.</div>}
    </div>
  );
}
