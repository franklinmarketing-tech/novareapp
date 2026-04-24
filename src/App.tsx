import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SuperAdminRoute } from "@/components/SuperAdminRoute";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { ClientLayout } from "@/components/layouts/ClientLayout";
import AdminClientLayout from "@/components/layouts/AdminClientLayout";
import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PWAResetListener } from "@/components/PWAResetListener";

import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import AcceptInvite from "@/pages/AcceptInvite";
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
import AdminAjuda from "@/pages/admin/AdminAjuda";
import AdminLeadsNewsletter from "@/pages/AdminLeadsNewsletter";
import ClientDashboard from "@/pages/cliente/ClientDashboard";
import ClientOnboardingPage from "@/pages/cliente/ClientOnboarding";

import MyData from "@/pages/cliente/MyData";
import ActionPlan from "@/pages/cliente/ActionPlan";
import Monitoring from "@/pages/cliente/Monitoring";
import ClientSettings from "@/pages/cliente/ClientSettings";
import YieldGuide from "@/pages/YieldGuide";

import SuperAdminDashboard from "@/pages/super-admin/SuperAdminDashboard";
import SuperAdminAdmins from "@/pages/super-admin/SuperAdminAdmins";
import SuperAdminClients from "@/pages/super-admin/SuperAdminClients";
import SuperAdminAudit from "@/pages/super-admin/SuperAdminAudit";
import SuperAdminFeatureFlags from "@/pages/super-admin/SuperAdminFeatureFlags";
import SuperAdminConfig from "@/pages/super-admin/SuperAdminConfig";
import SuperAdminBackups from "@/pages/super-admin/SuperAdminBackups";
import SuperAdminSeguranca from "@/pages/super-admin/SuperAdminSeguranca";
import SuperAdminUsuarios from "@/pages/super-admin/SuperAdminUsuarios";
import SuperAdminOperacoes from "@/pages/super-admin/SuperAdminOperacoes";
import SuperAdminSaude from "@/pages/super-admin/SuperAdminSaude";
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
          <PWAInstallPrompt />
          <PWAResetListener />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/aceitar-convite/:token" element={<AcceptInvite />} />
                <Route path="/ferramentas/calculadora-de-investimentos" element={<YieldGuide />} />

                {/* Super Admin routes */}
                <Route path="/super-admin" element={<SuperAdminRoute><SuperAdminLayout><SuperAdminDashboard /></SuperAdminLayout></SuperAdminRoute>} />
                <Route path="/super-admin/admins" element={<SuperAdminRoute><SuperAdminLayout><SuperAdminAdmins /></SuperAdminLayout></SuperAdminRoute>} />
                <Route path="/super-admin/clientes" element={<SuperAdminRoute><SuperAdminLayout><SuperAdminClients /></SuperAdminLayout></SuperAdminRoute>} />
                <Route path="/super-admin/auditoria" element={<SuperAdminRoute><SuperAdminLayout><SuperAdminAudit /></SuperAdminLayout></SuperAdminRoute>} />
                <Route path="/super-admin/feature-flags" element={<SuperAdminRoute><SuperAdminLayout><SuperAdminFeatureFlags /></SuperAdminLayout></SuperAdminRoute>} />
                <Route path="/super-admin/configuracao" element={<SuperAdminRoute><SuperAdminLayout><SuperAdminConfig /></SuperAdminLayout></SuperAdminRoute>} />
                <Route path="/super-admin/backups" element={<SuperAdminRoute><SuperAdminLayout><SuperAdminBackups /></SuperAdminLayout></SuperAdminRoute>} />
                <Route path="/super-admin/seguranca" element={<SuperAdminRoute><SuperAdminLayout><SuperAdminSeguranca /></SuperAdminLayout></SuperAdminRoute>} />
                <Route path="/super-admin/usuarios" element={<SuperAdminRoute><SuperAdminLayout><SuperAdminUsuarios /></SuperAdminLayout></SuperAdminRoute>} />
                <Route path="/super-admin/operacoes" element={<SuperAdminRoute><SuperAdminLayout><SuperAdminOperacoes /></SuperAdminLayout></SuperAdminRoute>} />
                <Route path="/super-admin/saude" element={<SuperAdminRoute><SuperAdminLayout><SuperAdminSaude /></SuperAdminLayout></SuperAdminRoute>} />

                {/* Admin routes */}
                <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/clientes" element={<ProtectedRoute requiredRole="admin"><AdminLayout><ClientList /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/novo-cliente" element={<ProtectedRoute requiredRole="admin"><AdminLayout><NewClient /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/financeiro" element={<ProtectedRoute requiredRole="admin"><AdminLayout><AdminFinanceiro /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/configuracoes" element={<ProtectedRoute requiredRole="admin"><AdminLayout><AdminSettings /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/workspace" element={<ProtectedRoute requiredRole="admin"><AdminLayout><AdminWorkspace /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/ajuda" element={<ProtectedRoute requiredRole="admin"><AdminLayout><AdminAjuda /></AdminLayout></ProtectedRoute>} />

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
