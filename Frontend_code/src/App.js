import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdPlayer = lazy(() => import('./pages/AdPlayerPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const BaggageCheckPage = lazy(() => import('./pages/BaggageCheckPage'));
const Maintenance = lazy(() => import('./pages/MaintenancePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AdminLoginPage = lazy(() => import('./pages/Admin'));






function App() {
  // Disable pinch‑zoom and drag gestures
  useEffect(() => {
    const preventTouchMove = (e) => {
      // Only block if the element is not explicitly scrollable (customize as needed)
      if (!e.target.closest('.scrollable')) {
        e.preventDefault();
      }
    };
    window.addEventListener('touchmove', preventTouchMove, { passive: false });
    window.addEventListener('dragstart', (e) => e.preventDefault());

    return () => {
      window.removeEventListener('touchmove', preventTouchMove);
      window.removeEventListener('dragstart', (e) => e.preventDefault());
    };
  }, []);

  return (
    <Router>
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          userSelect: 'none',        
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          touchAction: 'none',       
          WebkitUserDrag: 'none',     
        }}
      >
        <Suspense fallback={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            backgroundColor: "var(--theme-bg, #000)",
            color: "var(--theme-font, #fff)"
          }}>
            Loading System...
          </div>
        }>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/ad_player" element={<AdPlayer />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/baggageCheckPage" element={<BaggageCheckPage />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/admin" element={<AdminLoginPage />} />

          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;