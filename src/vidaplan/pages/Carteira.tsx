// Conectar Banco: consolidação via Open Finance + gastos invisíveis (premium).
import MinhaCarteira from "@/pages/cliente/MinhaCarteira";
import GastosInvisiveis from "../components/GastosInvisiveis";
import PremiumGate from "../components/PremiumGate";
import { ShieldCheck } from "lucide-react";

const Carteira = () => (
  <div className="space-y-6 max-w-3xl mx-auto">
    <div className="rounded-2xl bg-[#16314f] p-5 text-white">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Open Finance</p>
          <h1 className="font-display text-2xl font-bold">Conectar Banco</h1>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80">
          <ShieldCheck className="h-3.5 w-3.5" /> Banco Central · somente leitura
        </span>
      </div>
      <p className="text-sm text-white/60 mt-2">Conecte seus bancos pelo Open Finance e veja tudo consolidado — investimentos, saldos e gastos invisíveis.</p>
    </div>

    <MinhaCarteira />
    <PremiumGate titulo="Gastos invisíveis" descricao="Revele assinaturas esquecidas, juros e taxas bancárias dos últimos 90 dias.">
      <GastosInvisiveis />
    </PremiumGate>
  </div>
);

export default Carteira;
