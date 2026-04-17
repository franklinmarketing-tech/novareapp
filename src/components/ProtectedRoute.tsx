import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";

interface Props {
  children: React.ReactNode;
  requiredRole?: "admin" | "client";
}

export const ProtectedRoute = ({ children, requiredRole }: Props) => {
  const { user, role, loading, clientStatus } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole && role !== requiredRole) {
    return <Navigate to={role === "admin" ? "/admin" : "/cliente"} replace />;
  }

  // Client-specific routing logic
  if (role === "client") {
    const isOnboardingRoute = location.pathname === "/cliente/onboarding";
    // If onboarding not done → force onboarding (unless already there)
    if (clientStatus === "onboarding_pendente" && !isOnboardingRoute) {
      return <Navigate to="/cliente/onboarding" replace />;
    }

    // If onboarding done → don't allow going back to onboarding
    if (clientStatus !== "onboarding_pendente" && isOnboardingRoute) {
      return <Navigate to="/cliente" replace />;
    }
  }

  return <>{children}</>;
};
