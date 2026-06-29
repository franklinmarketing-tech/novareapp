// Exige usuário autenticado para a área do app. Sem login → tela de login do Vida Plan.
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { ReactNode } from "react";
import VidaPlanLoader from "./VidaPlanLoader";

const VidaPlanGuard = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <VidaPlanLoader />;
  if (!user) return <Navigate to="/vidaplan/login" replace />;
  return <>{children}</>;
};

export default VidaPlanGuard;
