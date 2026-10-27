import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import TorneosPage from './pages/Torneos/TorneosPage';
import TorneoDetallePage from './pages/Torneos/TorneoDetallePage';
import CatalogoPublicoPage from './pages/Equipos/CatalogoPublicoPage';
import JugadoresPage from './pages/Jugadores/JugadoresPage';
import MisPartidosPage from './pages/MisPartidos/MisPartidosPage';
import ProfilePage from './pages/Profile/ProfilePage';
import SalonFamaPage from './pages/SalonFama/SalonFamaPage';
import AdminPage from './pages/Admin/AdminPage';
import CatalogoAdminPage from './pages/Admin/CatalogoAdminPage';
import CrearTorneoPage from './pages/Admin/CrearTorneoPage';
import ResultadosPage from './pages/Admin/ResultadosPage';
import InscripcionesAdminPage from './pages/Admin/InscripcionesAdminPage';
import JugadoresAdminPage from './pages/Admin/JugadoresAdminPage';
import LigaPage from './pages/Liga/LigaPage';
import LigaDetallePage from './pages/Liga/LigaDetallePage';
import LigaAdminPage from './pages/Admin/LigaAdminPage';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
        <span className="logo-text">TORNEITOS DE TRANKIS</span>
      </div>
    );
  }

  return (
    <Routes>
      {/* Auth pages — redirect to home if already logged in */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/registro"
        element={user ? <Navigate to="/" replace /> : <RegisterPage />}
      />

      {/* Protected routes within main layout (allow guests by default) */}
      <Route
        element={
          <ProtectedRoute requireAuth={false}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/torneos" element={<TorneosPage />} />
        <Route path="/torneos/:id" element={<TorneoDetallePage />} />
        <Route path="/jugadores" element={<JugadoresPage />} />
        <Route path="/catalogo" element={<CatalogoPublicoPage />} />
        <Route path="/salon-fama" element={<SalonFamaPage />} />
        <Route
          path="/mis-partidos"
          element={
            <ProtectedRoute requireAuth={true}>
              <MisPartidosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/perfil"
          element={
            <ProtectedRoute requireAuth={true}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/catalogo"
          element={
            <ProtectedRoute requireAdmin>
              <CatalogoAdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/torneos/crear"
          element={
            <ProtectedRoute requireAdmin>
              <CrearTorneoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/resultados"
          element={
            <ProtectedRoute requireAdmin>
              <ResultadosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/inscripciones"
          element={
            <ProtectedRoute requireAdmin>
              <InscripcionesAdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/jugadores"
          element={
            <ProtectedRoute requireAdmin>
              <JugadoresAdminPage />
            </ProtectedRoute>
          }
        />
        {/* Liga Mode */}
        <Route path="/liga" element={<LigaPage />} />
        <Route path="/liga/:id" element={<LigaDetallePage />} />
        <Route
          path="/admin/liga"
          element={
            <ProtectedRoute requireAdmin>
              <LigaAdminPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
