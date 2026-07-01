// App "Novare Vida Plan" — montado em /vidaplan/* (e na raiz quando o host é o subdomínio).
import { Navigate, Route, Routes } from "react-router-dom";
import { VidaPlanProvider } from "./state/VidaPlanContext";
import { SubscriptionProvider } from "./state/useSubscription";
import { ConsultorPerfilProvider } from "./state/ConsultorPerfil";
import VidaPlanGuard from "./components/VidaPlanGuard";
import VidaPlanLayout from "./components/VidaPlanLayout";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Painel from "./pages/Painel";
import Sonhos from "./pages/Sonhos";
import Independencia from "./pages/Independencia";
import Realidade from "./pages/Realidade";
import Carteira from "./pages/Carteira";
import Projecao from "./pages/Projecao";
import Plano from "./pages/Plano";
import Progresso from "./pages/Progresso";
import Assistente from "./pages/Assistente";
import Marca from "./pages/Marca";
import Clientes from "./pages/Clientes";
import Cenarios from "./pages/Cenarios";
import Aprender from "./pages/Aprender";
import Orcamento from "./pages/Orcamento";
import Assinar from "./pages/Assinar";

const VidaPlanApp = () => (
  <VidaPlanProvider>
    <SubscriptionProvider>
      <ConsultorPerfilProvider>
      <Routes>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="cliente" element={<Landing audience="cliente" />} />
        <Route path="consultor" element={<Landing audience="consultor" />} />
        <Route path="parceiro" element={<Landing audience="consultor" />} />
        <Route path="app" element={<VidaPlanGuard><VidaPlanLayout /></VidaPlanGuard>}>
          <Route index element={<Painel />} />
          <Route path="sonhos" element={<Sonhos />} />
          <Route path="independencia" element={<Independencia />} />
          <Route path="realidade" element={<Realidade />} />
          <Route path="carteira" element={<Carteira />} />
          <Route path="projecao" element={<Projecao />} />
          <Route path="plano" element={<Plano />} />
          <Route path="progresso" element={<Progresso />} />
          <Route path="assistente" element={<Assistente />} />
          <Route path="marca" element={<Marca />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="cenarios" element={<Cenarios />} />
          <Route path="aprender" element={<Aprender />} />
          <Route path="orcamento" element={<Orcamento />} />
          <Route path="assinar" element={<Assinar />} />
        </Route>
        <Route path="*" element={<Navigate to="/vidaplan/app" replace />} />
      </Routes>
      </ConsultorPerfilProvider>
    </SubscriptionProvider>
  </VidaPlanProvider>
);

export default VidaPlanApp;
