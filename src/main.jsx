import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
// 👇 1. IMPORTA ESTO
import { HelmetProvider } from 'react-helmet-async';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      {' '}
      {/* <--- AGREGAR ESTO */}
      <App />
    </HelmetProvider>{' '}
    {/* <--- Y CERRARLO AQUÍ */}
  </React.StrictMode>
);
