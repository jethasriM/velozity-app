import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import PMDashboard from "./pages/PMDashboard";
import DeveloperDashboard from "./pages/DeveloperDashboard";
import ProjectDetail from "./pages/ProjectDetail";

function RoleDashboard() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "ADMIN") return <AdminDashboard />;
  if (user.role === "PM") return <PMDashboard />;
  return <DeveloperDashboard />;
}

function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-400">Loading…</div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return (
    <SocketProvider>
      <Layout />
    </SocketProvider>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? null : user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route path="/" element={<ProtectedLayout />}>
        <Route index element={<RoleDashboard />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
