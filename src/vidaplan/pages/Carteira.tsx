// Carteira: consolidação via Open Finance + gastos invisíveis.
import MinhaCarteira from "@/pages/cliente/MinhaCarteira";
import GastosInvisiveis from "../components/GastosInvisiveis";

const Carteira = () => (
  <div className="space-y-6 max-w-3xl mx-auto">
    <MinhaCarteira />
    <GastosInvisiveis />
  </div>
);

export default Carteira;
