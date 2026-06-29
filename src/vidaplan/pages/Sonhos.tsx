// Meus Sonhos: os objetivos de vida que compõem o Marco Horizonte.
import { useVidaPlan, brl0 } from "../state/VidaPlanContext";
import { VPCard, VPTitle } from "../components/ui";
import type { GoalType } from "@/lib/lifeplan";
import { Plus, Trash2, Plane, Gift, Home, Car, GraduationCap, Star } from "lucide-react";

const TIPOS: { tipo: GoalType; label: string; icon: typeof Plane; anual?: boolean }[] = [
  { tipo: "viagens", label: "Viagens e lazer", icon: Plane, anual: true },
  { tipo: "festas", label: "Festas e presentes", icon: Gift, anual: true },
  { tipo: "imovel", label: "Imóvel", icon: Home },
  { tipo: "carro", label: "Veículo", icon: Car },
  { tipo: "educacao", label: "Educação", icon: GraduationCap },
  { tipo: "outro", label: "Outro objetivo", icon: Star },
];
const meta = (t: GoalType) => TIPOS.find((x) => x.tipo === t) || TIPOS[5];

const num = (v: string) => parseFloat(v) || 0;

const Sonhos = () => {
  const { input, addGoal, updateGoal, removeGoal, plan } = useVidaPlan();
  const anoBase = input.anoAtual;

  return (
    <div className="space-y-6">
      <VPTitle hint="Sonhar é o primeiro passo. Tudo aqui entra no seu Marco Horizonte.">Meus Sonhos</VPTitle>

      <VPCard className="p-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#1b2a3d]/50">Total dos sonhos até a independência</p>
          <p className="font-display text-2xl font-bold text-[#C8643F] tabular-nums">{brl0(plan.totalObjetivos)}</p>
        </div>
      </VPCard>

      <div className="space-y-3">
        {input.goals.map((g) => {
          const m = meta(g.tipo);
          return (
            <VPCard key={g.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-[#16314f]/[0.06] flex items-center justify-center shrink-0">
                  <m.icon className="h-4 w-4 text-[#16314f]" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={g.nome ?? ""}
                      placeholder={m.label}
                      onChange={(e) => updateGoal(g.id, { nome: e.target.value })}
                      className="flex-1 bg-transparent font-semibold text-[#16314f] outline-none border-b border-transparent focus:border-[#C8643F]/40 pb-0.5"
                    />
                    <button onClick={() => removeGoal(g.id)} className="text-[#1b2a3d]/30 hover:text-[#C8643F] transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <Mini label="Tipo">
                      <select
                        value={g.tipo}
                        onChange={(e) => updateGoal(g.id, { tipo: e.target.value as GoalType })}
                        className="w-full bg-transparent text-sm text-[#16314f] outline-none"
                      >
                        {TIPOS.map((t) => <option key={t.tipo} value={t.tipo}>{t.label}</option>)}
                      </select>
                    </Mini>
                    <Mini label={m.anual ? "Valor por ano" : "Valor"}>
                      <input type="number" value={g.valor} onChange={(e) => updateGoal(g.id, { valor: num(e.target.value) })}
                        className="w-full bg-transparent text-sm text-[#16314f] outline-none tabular-nums" />
                    </Mini>
                    {!m.anual && (
                      <Mini label="Ano">
                        <input type="number" value={g.ano ?? anoBase} onChange={(e) => updateGoal(g.id, { ano: num(e.target.value) })}
                          className="w-full bg-transparent text-sm text-[#16314f] outline-none tabular-nums" />
                      </Mini>
                    )}
                    {g.tipo === "carro" && (
                      <Mini label="Troca a cada (anos)">
                        <input type="number" value={g.intervaloAnos ?? 5} onChange={(e) => updateGoal(g.id, { intervaloAnos: num(e.target.value) })}
                          className="w-full bg-transparent text-sm text-[#16314f] outline-none tabular-nums" />
                      </Mini>
                    )}
                  </div>

                  {g.tipo === "imovel" && (
                    <label className="flex items-center gap-2 text-xs text-[#1b2a3d]/70">
                      <input type="checkbox" checked={!!g.financiar} onChange={(e) => updateGoal(g.id, { financiar: e.target.checked })} />
                      Financiado
                      {g.financiar && (
                        <span className="flex flex-wrap gap-2 ml-1">
                          <InlineNum label="entrada %" value={g.entradaPct ?? 20} onChange={(v) => updateGoal(g.id, { entradaPct: v })} />
                          <InlineNum label="prazo anos" value={g.prazoAnos ?? 25} onChange={(v) => updateGoal(g.id, { prazoAnos: v })} />
                          <InlineNum label="juros % a.a." value={g.jurosAa ?? 10} onChange={(v) => updateGoal(g.id, { jurosAa: v })} />
                        </span>
                      )}
                    </label>
                  )}
                </div>
              </div>
            </VPCard>
          );
        })}
      </div>

      <button
        onClick={() => addGoal({ tipo: "outro", nome: "", valor: 30000, ano: anoBase + 3 })}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#16314f]/25 py-3 text-sm font-semibold text-[#16314f] hover:bg-[#16314f]/[0.03] transition-colors"
      >
        <Plus className="h-4 w-4" /> Adicionar objetivo
      </button>
    </div>
  );
};

const Mini = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="rounded-lg border border-black/[0.07] px-2.5 py-1.5">
    <p className="text-[9px] uppercase tracking-wider text-[#1b2a3d]/40">{label}</p>
    {children}
  </div>
);

const InlineNum = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <span className="inline-flex items-center gap-1">
    <input type="number" value={value} onChange={(e) => onChange(num(e.target.value))}
      className="w-12 bg-white border border-black/10 rounded px-1 py-0.5 text-[#16314f] tabular-nums" />
    {label}
  </span>
);

export default Sonhos;
