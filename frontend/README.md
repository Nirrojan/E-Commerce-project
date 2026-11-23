# Blush & Bloom – React + Bootstrap frontend

A responsive beauty e-commerce frontend built with React, Vite, React Router and Bootstrap.

## Requirements
- Node.js 18 or later
- npm

## Run locally
```bash
npm install
npm run dev
```
Open the local URL printed by Vite (normally http://localhost:5173).

## Included screens
- Register and login
- Home, About, Products, Product details and Services
- Shopping cart and checkout
- Simulated payment confirmation
- Profile picture/name update
- Purchase history

## Demo behaviour and limitations
This is the **frontend-first prototype**. It stores demo users, cart items and demo orders in browser `localStorage`. It does not connect to Flask or MySQL yet. The demo login stores passwords in browser storage and is NOT secure; do not use real passwords or real customer information.

The payment page is explicitly a simulation. It does not process payments and must not be used with real card details. For a real application, connect Flask to a trusted payment gateway's hosted checkout/payment components and verify payment server-side. Never store card numbers or CVV in MySQL.

## Next integration stage
Replace the localStorage operations in `src/context/AuthContext.jsx` and `src/context/CartContext.jsx` with API calls to your Flask backend. Product data can later be loaded from Flask instead of `src/data/products.js`.

## Project structure
- `src/pages/` – page-level React components
- `src/components/` – reusable UI components
- `src/context/` – authentication and cart state
- `src/data/` – sample product and service data
- `src/styles.css` – custom styling on top of Bootstrap
