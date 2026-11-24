
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import About from "./pages/About";
import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";
import Services from "./pages/Services";
import ServiceDetails from "./pages/ServiceDetails";
import Therapists from "./pages/Therapists";
import TherapistProfile from "./pages/TherapistProfile";
import BookAppointment from "./pages/BookAppointment";
import AppointmentPayment from "./pages/AppointmentPayment";
import AppointmentResult from "./pages/AppointmentResult";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Payment from "./pages/Payment";
import CardPayment from "./pages/CardPayment";
import Profile from "./pages/Profile";
import MyPurchases from "./pages/MyPurchases";
import BookedServices from "./pages/BookedServices";

function Protected({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <>
      <Navbar />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/home" element={<Protected><Home /></Protected>} />
          <Route path="/about" element={<Protected><About /></Protected>} />

          <Route path="/products" element={<Protected><Products /></Protected>} />
          <Route path="/products/:id" element={<Protected><ProductDetails /></Protected>} />

          <Route path="/services" element={<Protected><Services /></Protected>} />
          <Route path="/services/:id" element={<Protected><ServiceDetails /></Protected>} />

          <Route path="/services/:serviceId/therapists" element={<Protected><Therapists /></Protected>} />
          <Route path="/therapists/:therapistId" element={<Protected><TherapistProfile /></Protected>} />

          <Route path="/book/:serviceId/:therapistId" element={<Protected><BookAppointment /></Protected>} />
          <Route path="/appointment-payment/:appointmentId" element={<Protected><AppointmentPayment /></Protected>} />
          <Route path="/appointment-result" element={<Protected><AppointmentResult /></Protected>} />

          <Route path="/cart" element={<Protected><Cart /></Protected>} />
          <Route path="/checkout" element={<Protected><Checkout /></Protected>} />

          <Route path="/payment" element={<Protected><Payment /></Protected>} />
          <Route path="/card-payment/:orderId" element={<Protected><CardPayment /></Protected>} />

          <Route path="/profile" element={<Protected><Profile /></Protected>} />
          <Route path="/my-purchases" element={<Protected><MyPurchases /></Protected>} />
          <Route path="/booked-services" element={<Protected><BookedServices /></Protected>} />

          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </main>

      <Footer />
    </>
  );
}
