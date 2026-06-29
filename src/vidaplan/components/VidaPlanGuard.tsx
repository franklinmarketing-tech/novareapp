// Exige usuário autenticado para a área do app. Sem login → tela de login do Vida Plan.
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { ReactNode } from "react";

const VidaPlanGuard = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F1EA]">
        <div className="h-7 w-7 rounded-full border-[3px] border-[#16314f]/15 border-t-[#16314f] animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/vidaplan/login" replace />;
  return <>{children}</>;
};

export default VidaPlanGuard;
