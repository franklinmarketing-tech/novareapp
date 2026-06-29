// Guia "4 etapas para um projeto de vida completo" — dispensável (lembra no localStorage).
import { useState } from "react";
import { Link } from "react-router-dom";
import { useVidaPlan, brl0 } from "../state/VidaPlanContext";
import { X, ChevronRight } from "lucide-react";

const KEY = "vidaplan:guide:dismissed";

const OnboardingGuide = () => {
  const { input, plan } = useVidaPlan();
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(KEY) !== "1"; } catch { return true; }
  });
  if (!open) return null;
  const dismiss = () => { try { localStorage.setItem(KEY, "1"); } catch { /* ignora */ } setOpen(false); };

  const etapas = [
    { n: 1, to: "/vidaplan/app/sonhos", titulo: "Liste seus sonhos", valor: `${input.goals.length} objetivo(s) · ${brl0(plan.totalObjetivos)}` },
    { n: 2, to: "/vidaplan/app/independencia", titulo: "Defina a independência", valor: `aos ${input.idadeAposentadoria} · ${brl0(input.rendaAposDesejada)}/mês` },
    { n: 3, to: "/vidaplan/app/realidade", titulo: "Ajuste sua realidade", valor: `renda, custos e dívidas` },
    { n: 4, to: "/vidaplan/app/realidade", titulo: "Escolha a rentabilidade", valor: `IPCA + ${input.rentRealPct}% a.a.` },
  ];

  return (
    <div className="rounded-2xl border border-[#16314f]/15 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-lg font-bold text-[#16314f]">4 etapas para um projeto completo</p>
          <p className="text-sm text-[#1b2a3d]/60">Revise cada uma e veja seu plano ganhar forma.</p>
        </div>
        <button onClick={dismiss} className="text-[#1b2a3d]/30 hover:text-[#1b2a3d]/70" aria-label="Dispensar"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-4 space-y-2">
        {etapas.map((e) => (
          <Link key={e.n} to={e.to}
            className="flex items-center gap-3 rounded-xl border border-black/[0.06] px-3 py-2.5 hover:border-[#C8643F]/40 hover:bg-[#16314f]/[0.02] transition-colors">
            <span className="h-7 w-7 rounded-full bg-[#16314f] text-white text-sm font-bold flex items-center justify-center shrink-0">{e.n}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#16314f]">{e.titulo}</p>
              <p className="text-xs text-[#1b2a3d]/50 truncate">{e.valor}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-[#1b2a3d]/30 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default OnboardingGuide;
