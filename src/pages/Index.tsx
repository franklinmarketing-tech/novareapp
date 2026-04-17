import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (role === "admin") navigate("/admin", { replace: true });
    else if (role === "client") navigate("/cliente", { replace: true });
    else navigate("/login", { replace: true });
  }, [role, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
};

export default Index;
