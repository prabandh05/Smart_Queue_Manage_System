import "./App.css";
import { Toaster } from "@/components/ui/toaster";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./hooks/use-auth";
import { Loader2 } from "lucide-react";

// Protected Route Component
export const ProtectedRoute = ({ children, requireRole }: { children: React.ReactNode; requireRole?: 'citizen' | 'officer' | 'admin' }) => {
  const { isAuthenticated, profile, resolvedRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const role = resolvedRole || (profile?.is_admin ? 'admin' : (profile?.is_officer ? 'officer' : 'citizen'));
  if (requireRole && role !== requireRole && role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Outlet />
      <Toaster />
    </div>
  );
}

export default App;