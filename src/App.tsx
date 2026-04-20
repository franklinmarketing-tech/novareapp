import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { ClientLayout } from "@/components/layouts/ClientLayout";
import AdminClientLayout from "@/components/layouts/AdminClientLayout";

import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import ClientList from "@/pages/admin/ClientList";
import NewClient from "@/pages/admin/NewClient";
import ClientOnboarding from "@/pages/admin/ClientOnboarding";
import ClientDiagnosis from "@/pages/admin/ClientDiagnosis";
import AdminActionPlan from "@/pages/admin/AdminActionPlan";

import AdminMonitoring from "@/pages/admin/AdminMonitoring";
import AdminReport from "@/pages/admin/AdminReport";
import AdminFinanceiro from "@/pages/admin/AdminFinanceiro";
import AdminInvestments from "@/pages/admin/AdminInvestments";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminParecer from "@/pages/admin/AdminParecer";
import AdminObjetivos from "@/pages/admin/AdminObjetivos";
import AdminWorkspace from "@/pages/admin/AdminWorkspace";
import ClientDashboard from "@/pages/cliente/ClientDashboard";
import ClientOnboardingPage from "@/pages/cliente/ClientOnboarding";

import MyData from "@/pages/cliente/MyData";
import ActionPlan from "@/pages/cliente/ActionPlan";
import Monitoring from "@/pages/cliente/Monitoring";
import ClientSettings from "@/pages/cliente/ClientSettings";
import YieldGuide from "@/pages/YieldGuide";
const queryClient = new QueryClient();

const RootRedirect = () => {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (role === "super_admin") return <Navigate to="/super-admin" replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  return <Navigate to="/cliente" replace />;
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/ferramentas/calculadora-de-investimentos" element={<YieldGuide />} />

                {/* Admin routes */}
                <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/clientes" element={<ProtectedRoute requiredRole="admin"><AdminLayout><ClientList /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/novo-cliente" element={<ProtectedRoute requiredRole="admin"><AdminLayout><NewClient /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/financeiro" element={<ProtectedRoute requiredRole="admin"><AdminLayout><AdminFinanceiro /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/configuracoes" element={<ProtectedRoute requiredRole="admin"><AdminLayout><AdminSettings /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/workspace" element={<ProtectedRoute requiredRole="admin"><AdminLayout><AdminWorkspace /></AdminLayout></ProtectedRoute>} />

                {/* Admin client routes with tabs */}
                <Route path="/admin/cliente/:clientSlug" element={<ProtectedRoute requiredRole="admin"><AdminLayout><AdminClientLayout /></AdminLayout></ProtectedRoute>}>
                  <Route path="onboarding" element={<ClientOnboarding />} />
                  <Route path="diagnostico" element={<ClientDiagnosis />} />
                  <Route path="parecer" element={<AdminParecer />} />
                  <Route path="plano-acao" element={<AdminActionPlan />} />
                  <Route path="objetivos" element={<AdminObjetivos />} />
                  <Route path="investimentos" element={<AdminInvestments />} />
                  <Route path="acompanhamento" element={<AdminMonitoring />} />
                  <Route path="relatorio" element={<AdminReport />} />
                </Route>

                {/* Client routes */}
                <Route path="/cliente" element={<ProtectedRoute requiredRole="client"><ClientLayout><ClientDashboard /></ClientLayout></ProtectedRoute>} />
                <Route path="/cliente/onboarding" element={<ProtectedRoute requiredRole="client"><ClientOnboardingPage /></ProtectedRoute>} />
                
                <Route path="/cliente/meus-dados" element={<ProtectedRoute requiredRole="client"><ClientLayout><MyData /></ClientLayout></ProtectedRoute>} />
                <Route path="/cliente/plano-acao" element={<ProtectedRoute requiredRole="client"><ClientLayout><ActionPlan /></ClientLayout></ProtectedRoute>} />
                <Route path="/cliente/acompanhamento" element={<ProtectedRoute requiredRole="client"><ClientLayout><Monitoring /></ClientLayout></ProtectedRoute>} />
                <Route path="/cliente/configuracoes" element={<ProtectedRoute requiredRole="client"><ClientLayout><ClientSettings /></ClientLayout></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
