// Wizard de primeiro acesso: coleta o essencial em 3 passos e já monta o plano.
import { useState } from "react";
import { useVidaPlan } from "../state/VidaPlanContext";
import { VPField } from "./ui";
import logoBranca from "@/assets/logo-branca.png";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

const KEY = "vidaplan:wizard:done";

const OnboardingWizard = () => {
  const { input, setField, setCategorias } = useVidaPlan();
  const [visible, setVisible] = useState(() => { try { return !localStorage.getItem(KEY); } catch { return false; } });
  const [step, setStep] = useState(0);
  if (!visible) return null;

  const fechar = () => { try { localStorage.setItem(KEY, "1"); } catch { /* ignora */ } setVisible(false); };
  const setCusto = (v: number) => { setField("custoFixoMensal", v); setCategorias([{ nome: "Custo de vida", valor: v }]); };

  const passos = [
    {
      titulo: "Vamos começar 👋",
      sub: "Seu horizonte de tempo — pode ajustar depois.",
      campos: (
        <>
          <VPField label="Sua idade hoje" value={input.idadeAtual} onChange={(v) => setField("idadeAtual", v)} />
          <VPField label="Idade da independência" value={input.idadeAposentadoria} onChange={(v) => setField("idadeAposentadoria", v)} />
          <VPField label="Expectativa de vida" value={input.idadeFim} onChange={(v) => setField("idadeFim", v)} />
        </>
      ),
    },
    {
      titulo: "Sua realidade 💰",
      sub: "Uma fotografia rápida das suas finanças.",
      campos: (
        <>
          <VPField label="Renda mensal líquida" suffix="R$/mês" step={100} value={input.rendaMensal} onChange={(v) => setField("rendaMensal", v)} />
          <VPField label="Custo de vida mensal" suffix="R$/mês" step={100} value={input.custoFixoMensal} onChange={setCusto} />
          <VPField label="Patrimônio investido hoje" suffix="R$" step={1000} value={input.patrimonioAtual} onChange={(v) => setField("patrimonioAtual", v)} />
        </>
      ),
    },
    {
      titulo: "Seu sonho maior 🌅",
      sub: "Quanto você quer receber por mês quando for independente?",
      campos: (
        <>
          <VPField label="Renda desejada na independência" suffix="R$/mês (hoje)" step={100} value={input.rendaAposDesejada} onChange={(v) => setField("rendaAposDesejada", v)} />
          <VPField label="Renda já garantida (INSS/previdência)" suffix="R$/mês" step={100} value={input.rendaINSS} onChange={(v) => setField("rendaINSS", v)} />
        </>
      ),
    },
  ];
  const p = passos[step];
  const ultimo = step === passos.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#16314f]/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-[#16314f] px-6 py-4 flex items-center justify-between">
          <img src={logoBranca} alt="Novare" className="h-5 w-auto" />
          <button onClick={fechar} className="text-[11px] text-white/50 hover:text-white">Pular</button>
        </div>
        <div className="p-6">
          <div className="flex gap-1.5 mb-4">
            {passos.map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-[#C8643F]" : "bg-black/[0.08]"}`} />)}
          </div>
          <p className="font-display text-xl font-bold text-[#16314f]">{p.titulo}</p>
          <p className="text-sm text-[#1b2a3d]/60 mt-1 mb-4">{p.sub}</p>
          <div className="space-y-3">{p.campos}</div>
          <div className="mt-6 flex items-center justify-between">
            {step > 0
              ? <button onClick={() => setStep(step - 1)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1b2a3d]/60 hover:text-[#16314f]"><ArrowLeft className="h-4 w-4" /> Voltar</button>
              : <span />}
            <button onClick={() => (ultimo ? fechar() : setStep(step + 1))}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#16314f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1d3e63]">
              {ultimo ? <><Sparkles className="h-4 w-4" /> Ver meu plano</> : <>Próximo <ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
