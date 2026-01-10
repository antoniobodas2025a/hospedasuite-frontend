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
          path='/hunter'
          element={<HunterDashboard />}
        />

        {/* OJO: Esta ruta debería estar protegida en el futuro */}
        <Route
          path='/super-secret-admin'
          element={<SuperAdminPage />}
        />

        {/* =========================================
            2. RUTAS OPERATIVAS (HUÉSPED)
           ========================================= */}
        {/* Reserva (Español e Inglés) */}
        <Route
          path='/reservar/:hotelId'
          element={<BookingPage />}
        />
        <Route
          path='/book/:hotelId'
          element={<BookingPage />}
        />

        {/* Procesos */}
        <Route
          path='/checkin'
          element={<CheckInPage />}
        />
        <Route
          path='/menu/:hotelId'
          element={<MenuPage />}
        />

        {/* =========================================
            3. LANDING PAGES (MARKETING)
           ========================================= */}
        {/* Rutas específicas de Landing */}
        <Route
          path='/elite/:city_slug'
          element={<LandingPage />}
        />
        <Route
          path='/landing/:city_slug'
          element={<LandingPage />}
        />
        <Route
          path='/landing'
          element={<LandingPage />}
        />

        {/* =========================================
            4. RUTAS RAÍZ Y DINÁMICAS (CATCH-ALL)
           ========================================= */}
        {/* Home */}
        <Route
          path='/'
          element={<LandingPage />}
        />

        {/* ⚠️ CUIDADO: Esta ruta atrapa cualquier cosa (ej: tudominio.com/lo-que-sea)
            React Router v6 prioriza las rutas específicas de arriba (como /login), 
            así que esto funcionará bien para ciudades como /medellin */}
        <Route
          path='/:city_slug'
          element={<LandingPage />}
        />

        {/* =========================================
            5. MANEJO DE ERRORES (404)
            SIEMPRE DEBE IR AL FINAL ABSOLUTO
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
