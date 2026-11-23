import React from "react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { categories, products } from "../data/products";
export default function Products(){
 const [params] = useSearchParams(); const initial=params.get("category")||"All"; const [category,setCategory]=useState(categories.includes(initial)?initial:"All"); const [search,setSearch]=useState("");
 const filtered=useMemo(()=>products.filter(p=>(category==="All"||p.category===category)&&p.name.toLowerCase().includes(search.toLowerCase())),[category,search]);
 return <div className="container py-5"><span className="eyebrow">THE BEAUTY EDIT</span><h1 className="section-title mt-2">Our products</h1><p className="text-muted">Little essentials for your everyday routine.</p>
 <div className="row align-items-center g-3 my-3"><div className="col-lg-8"><div className="filter-pills">{categories.map(c=><button key={c} onClick={()=>setCategory(c)} className={`filter-pill ${category===c?"active":""}`}>{c}</button>)}</div></div><div className="col-lg-4"><input className="form-control" placeholder="Search products..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
 <div className="row g-4">{filtered.map(p=><div className="col-6 col-lg-3" key={p.id}><ProductCard product={p}/></div>)}</div>{filtered.length===0&&<div className="empty-state">No products found. Try another search.</div>}</div>;
}