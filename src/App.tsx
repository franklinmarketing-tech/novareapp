// Novareapp - protocolo visual ativo
import { lazy, Suspense } from "react";
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
import { CookieBanner } from "@/components/CookieBanner";

// Páginas carregadas sob demanda (code-splitting) — cada rota vira um chunk
// separado, então o carregamento inicial (login/calculadora) não baixa o app
// inteiro (admin, cliente, jsPDF, Three.js, recharts etc.).
const Login = lazy(() => import("@/pages/Login"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const AcceptInvite = lazy(() => import("@/pages/AcceptInvite"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Termos = lazy(() => import("@/pages/Termos"));
const Privacidade = lazy(() => import("@/pages/Privacidade"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const ClientList = lazy(() => import("@/pages/admin/ClientList"));
const NewClient = lazy(() => import("@/pages/admin/NewClient"));
const ClientOnboarding = lazy(() => import("@/pages/admin/ClientOnboarding"));
const ClientDiagnosis = lazy(() => import("@/pages/admin/ClientDiagnosis"));
const AdminActionPlan = lazy(() => import("@/pages/admin/AdminActionPlan"));
const AdminMonitoring = lazy(() => import("@/pages/admin/AdminMonitoring"));
const AdminAcompanhamentoEvolucao = lazy(() => import("@/pages/admin/AdminAcompanhamentoEvolucao"));
const AdminClientPreview = lazy(() => import("@/pages/admin/AdminClientPreview"));
const AdminReport = lazy(() => import("@/pages/admin/AdminReport"));
const AdminFinanceiro = lazy(() => import("@/pages/admin/AdminFinanceiro"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminParecer = lazy(() => import("@/pages/admin/AdminParecer"));
const AdminWorkspace = lazy(() => import("@/pages/admin/AdminWorkspace"));
const AdminAjuda = lazy(() => import("@/pages/admin/AdminAjuda"));
const AdminLeadsNewsletter = lazy(() => import("@/pages/AdminLeadsNewsletter"));
const AdminLeadsPdf = lazy(() => import("@/pages/admin/AdminLeadsPdf"));
const AdminLeads = lazy(() => import("@/pages/admin/AdminLeads"));
const ClientDashboard = lazy(() => import("@/pages/cliente/ClientDashboard"));
const ClientOnboardingPage = lazy(() => import("@/pages/cliente/ClientOnboarding"));
const MyData = lazy(() => import("@/pages/cliente/MyData"));
const ClientReports = lazy(() => import("@/pages/cliente/ClientReports"));
const ActionPlan = lazy(() => import("@/pages/cliente/ActionPlan"));
const ClientLancamentoMes = lazy(() => import("@/pages/cliente/ClientLancamentoMes"));
const ClientSettings = lazy(() => import("@/pages/cliente/ClientSettings"));
const YieldGuide = lazy(() => import("@/pages/YieldGuide"));
const ObjetivosDeVida = lazy(() => import("@/pages/ObjetivosDeVida"));
const AdminObjetivosVida = lazy(() => import("@/pages/admin/AdminObjetivosVida"));
const ReportPreview = lazy(() => import("@/pages/dev/ReportPreview"));
const SuperAdminDashboard = lazy(() => import("@/pages/super-admin/SuperAdminDashboard"));
const SuperAdminAdmins = lazy(() => import("@/pages/super-admin/SuperAdminAdmins"));
const SuperAdminClients = lazy(() => import("@/pages/super-admin/SuperAdminClients"));
const SuperAdminAudit = lazy(() => import("@/pages/super-admin/SuperAdminAudit"));
const SuperAdminFeatureFlags = lazy(() => import("@/pages/super-admin/SuperAdminFeatureFlags"));
const SuperAdminConfig = lazy(() => import("@/pages/super-admin/SuperAdminConfig"));
const SuperAdminBackups = lazy(() => import("@/pages/super-admin/SuperAdminBackups"));
const SuperAdminSeguranca = lazy(() => import("@/pages/super-admin/SuperAdminSeguranca"));
const SuperAdminUsuarios = lazy(() => import("@/pages/super-admin/SuperAdminUsuarios"));
const SuperAdminOperacoes = lazy(() => import("@/pages/super-admin/SuperAdminOperacoes"));
const SuperAdminSaude = lazy(() => import("@/pages/super-admin/SuperAdminSaude"));

const queryClient = new QueryClient();

// Fallback enquanto o chunk da rota carrega
const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-7 w-7 rounded-full border-[3px] border-[#e4e4e8] border-t-[#1e3a5f] animate-spin" />
  </div>
);

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
              <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/aceitar-convite/:token" element={<AcceptInvite />} />
                <Route path="/termos" element={<Termos />} />
                <Route path="/privacidade" element={<Privacidade />} />
                <Route path="/ferramentas/calculadora-de-investimentos" element={<YieldGuide />} />
                <Route path="/objetivos-de-vida" element={<ObjetivosDeVida />} />
                <Route path="/dev/report-preview" element={<ReportPreview />} />

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
                <Route path="/super-admin/leads" element={<SuperAdminRoute><SuperAdminLayout><AdminLeads /></SuperAdminLayout></SuperAdminRoute>} />

                {/* Admin routes */}
                <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/clientes" element={<ProtectedRoute requiredRole="admin"><AdminLayout><ClientList /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/novo-cliente" element={<ProtectedRoute requiredRole="admin"><AdminLayout><NewClient /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/financeiro" element={<ProtectedRoute requiredRole="admin"><AdminLayout><AdminFinanceiro /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/configuracoes" element={<ProtectedRoute requiredRole="admin"><AdminLayout><AdminSettings /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/workspace" element={<ProtectedRoute requiredRole="admin"><AdminLayout><AdminWorkspace /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/ajuda" element={<ProtectedRoute requiredRole="admin"><AdminLayout><AdminAjuda /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/leads" element={<ProtectedRoute requiredRole="admin"><AdminLayout><AdminLeads /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/leads-newsletter" element={<ProtectedRoute requiredRole="admin"><AdminLayout><AdminLeadsNewsletter /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/leads-pdf" element={<ProtectedRoute requiredRole="admin"><AdminLayout><AdminLeadsPdf /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/projetos/objetivos-de-vida" element={<ProtectedRoute requiredRole="admin"><AdminLayout><AdminObjetivosVida /></AdminLayout></ProtectedRoute>} />

                {/* Admin client routes with tabs */}
                <Route path="/admin/cliente/:clientSlug" element={<ProtectedRoute requiredRole="admin"><AdminLayout><AdminClientLayout /></AdminLayout></ProtectedRoute>}>
                  <Route path="onboarding" element={<ClientOnboarding />} />
                  <Route path="diagnostico" element={<ClientDiagnosis />} />
                  <Route path="parecer" element={<AdminParecer />} />
                  <Route path="plano-acao" element={<AdminActionPlan />} />
                  {/* V9: Objetivos integrado como Dialog dentro do Diagnostico (sem rota propria) */}
                  {/* V9: card Investimentos EXCLUIDO permanentemente do fluxo */}
                  <Route path="acompanhamento" element={<AdminMonitoring />} />
                  <Route path="evolucao" element={<AdminAcompanhamentoEvolucao />} />
                  <Route path="relatorio" element={<AdminReport />} />
                </Route>

                {/* Admin: ver como cliente (preview do painel do cliente) */}
                <Route path="/admin/preview/:clientSlug" element={<ProtectedRoute requiredRole="admin"><AdminClientPreview /></ProtectedRoute>}>
                  <Route index element={<ClientDashboard />} />
                  <Route path="meus-dados" element={<MyData />} />
                  <Route path="plano-acao" element={<ActionPlan />} />
                  <Route path="lancamento-mes" element={<ClientLancamentoMes />} />
                  <Route path="relatorios" element={<ClientReports />} />
                  <Route path="configuracoes" element={<ClientSettings />} />
                </Route>

                {/* Client routes */}
                <Route path="/cliente" element={<ProtectedRoute requiredRole="client"><ClientLayout><ClientDashboard /></ClientLayout></ProtectedRoute>} />
                <Route path="/cliente/onboarding" element={<ProtectedRoute requiredRole="client"><ClientOnboardingPage /></ProtectedRoute>} />
                
                <Route path="/cliente/meus-dados" element={<ProtectedRoute requiredRole="client"><ClientLayout><MyData /></ClientLayout></ProtectedRoute>} />
                <Route path="/cliente/plano-acao" element={<ProtectedRoute requiredRole="client"><ClientLayout><ActionPlan /></ClientLayout></ProtectedRoute>} />
                <Route path="/cliente/lancamento-mes" element={<ProtectedRoute requiredRole="client"><ClientLayout><ClientLancamentoMes /></ClientLayout></ProtectedRoute>} />
                <Route path="/cliente/relatorios" element={<ProtectedRoute requiredRole="client"><ClientLayout><ClientReports /></ClientLayout></ProtectedRoute>} />
                <Route path="/cliente/configuracoes" element={<ProtectedRoute requiredRole="client"><ClientLayout><ClientSettings /></ClientLayout></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
              <CookieBanner />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
