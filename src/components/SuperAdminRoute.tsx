import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

export const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role !== "super_admin") {
    return <Navigate to={role === "admin" ? "/admin" : "/cliente"} replace />;
  }
  return <>{children}</>;
};
