// Carteira: consolidação via Open Finance + gastos invisíveis (premium).
import MinhaCarteira from "@/pages/cliente/MinhaCarteira";
import GastosInvisiveis from "../components/GastosInvisiveis";
import PremiumGate from "../components/PremiumGate";

const Carteira = () => (
  <div className="space-y-6 max-w-3xl mx-auto">
    <MinhaCarteira />
    <PremiumGate titulo="Gastos invisíveis" descricao="Revele assinaturas esquecidas, juros e taxas bancárias dos últimos 90 dias.">
      <GastosInvisiveis />
    </PremiumGate>
  </div>
);

export default Carteira;
