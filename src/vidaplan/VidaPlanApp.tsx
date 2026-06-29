// App "Novare Vida Plan" — montado em /vidaplan/* (e na raiz quando o host é o subdomínio).
import { Navigate, Route, Routes } from "react-router-dom";
import { VidaPlanProvider } from "./state/VidaPlanContext";
import VidaPlanLayout from "./components/VidaPlanLayout";
import Painel from "./pages/Painel";
import Sonhos from "./pages/Sonhos";
import Independencia from "./pages/Independencia";
import Realidade from "./pages/Realidade";
import Carteira from "./pages/Carteira";
import Projecao from "./pages/Projecao";

const VidaPlanApp = () => (
  <VidaPlanProvider>
    <Routes>
      <Route index element={<Navigate to="/vidaplan/app" replace />} />
      <Route path="app" element={<VidaPlanLayout />}>
        <Route index element={<Painel />} />
        <Route path="sonhos" element={<Sonhos />} />
        <Route path="independencia" element={<Independencia />} />
        <Route path="realidade" element={<Realidade />} />
        <Route path="carteira" element={<Carteira />} />
        <Route path="projecao" element={<Projecao />} />
      </Route>
      <Route path="*" element={<Navigate to="/vidaplan/app" replace />} />
    </Routes>
  </VidaPlanProvider>
);

export default VidaPlanApp;
