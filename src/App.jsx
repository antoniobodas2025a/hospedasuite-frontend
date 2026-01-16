import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

// Importamos todas las páginas
import DashboardPage from './pages/DashboardPage';
import BookingPage from './pages/BookingPage';
import CheckInPage from './pages/CheckInPage';
import MenuPage from './pages/MenuPage';
import LoginPage from './pages/LoginPage';
import SuperAdminPage from './pages/SuperAdminPage';
import LandingPage from './pages/LandingPage';
import HunterDashboard from './pages/HunterDashboard';
import OnboardingPage from './pages/OnboardingPage';
import HomePage from './pages/HomePage'; // ✅ Buscador OTA

function App() {
  return (
    <Router>
      <Routes>
        {/* =========================================
            1. RUTAS DE ADMINISTRACIÓN (PRIVADAS)
           ========================================= */}
        <Route
          path='/login'
          element={<LoginPage />}
        />
        <Route
          path='/dashboard'
          element={<DashboardPage />}
        />
        <Route
          path='/onboarding'
          element={<OnboardingPage />}
        />
        <Route
          path='/hunter'
          element={<HunterDashboard />}
        />
        <Route
          path='/super-secret-admin'
          element={<SuperAdminPage />}
        />

        {/* =========================================
            2. RUTAS OPERATIVAS (HUÉSPED & OTA)
           ========================================= */}

        {/* ✅ NUEVA RUTA OTA: Detalle del Hotel */}
        <Route
          path='/hotel/:hotelId'
          element={<BookingPage />}
        />

        {/* Rutas Legacy de Reserva (Mantenidas por compatibilidad QR) */}
        <Route
          path='/reservar/:hotelId'
          element={<BookingPage />}
        />
        <Route
          path='/book/:hotelId'
          element={<BookingPage />}
        />

        {/* Procesos Operativos */}
        <Route
          path='/checkin'
          element={<CheckInPage />}
        />
        <Route
          path='/menu/:hotelId'
          element={<MenuPage />}
        />

        {/* =========================================
            3. HOME & MARKETING (ESTRUCTURA HÍBRIDA)
           ========================================= */}

        {/* A. LA NUEVA HOME (Buscador OTA) */}
        <Route
          path='/'
          element={<HomePage />}
        />

        {/* B. NUEVA LANDING DE VENTAS ("Soy Hotelero") */}
        <Route
          path='/soy-hotelero'
          element={<LandingPage />}
        />
        <Route
          path='/soy-hotelero/:city_slug'
          element={<LandingPage />}
        />

        {/* C. RUTAS LEGACY (RECUPERADAS PARA NO ROMPER CAMPAÑAS) */}
        {/* Campaña "Elite" sigue funcionando */}
        <Route
          path='/elite/:city_slug'
          element={<LandingPage />}
        />

        {/* Enlaces antiguos de /landing con ciudad siguen funcionando */}
        <Route
          path='/landing/:city_slug'
          element={<LandingPage />}
        />

        {/* Redirección suave: /landing sola va a /soy-hotelero */}
        <Route
          path='/landing'
          element={
            <Navigate
              to='/soy-hotelero'
              replace
            />
          }
        />

        {/* =========================================
            4. MANEJO DE ERRORES (404)
           ========================================= */}
        <Route
          path='*'
          element={
            <div className='min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-400 font-sans'>
              <h1 className='text-4xl font-bold mb-4 text-slate-800'>404</h1>
              <p>Página no encontrada en el sistema.</p>
              <a
                href='/'
                className='mt-4 text-blue-600 hover:underline'
              >
                Volver al inicio
              </a>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
