// Meus Sonhos: os objetivos de vida que compõem o Marco Horizonte.
import { useVidaPlan, brl0 } from "../state/VidaPlanContext";
import { VPCard, VPTitle } from "../components/ui";
import type { GoalType } from "@/lib/lifeplan";
import { Plus, Trash2, StickyNote } from "lucide-react";

type TipoMeta = { tipo: GoalType; label: string; emoji: string; cor: string; recorrentePadrao?: boolean; desc: string };
const TIPOS: TipoMeta[] = [
  { tipo: "viagens", label: "Viagens e lazer", emoji: "✈️", cor: "#5B8DB8", recorrentePadrao: true, desc: "Gasto que se repete todo ano até a independência." },
  { tipo: "festas", label: "Festas e presentes", emoji: "🎁", cor: "#C84F6B", recorrentePadrao: true, desc: "Datas comemorativas e presentes, ano após ano." },
  { tipo: "imovel", label: "Imóvel", emoji: "🏠", cor: "#2F8F6B", desc: "Compra à vista ou financiada, num ano específico." },
  { tipo: "carro", label: "Veículo", emoji: "🚗", cor: "#16314f", desc: "Compra com troca periódica (a cada X anos)." },
  { tipo: "educacao", label: "Educação", emoji: "🎓", cor: "#8E6BC8", desc: "Faculdade, pós ou cursos — num ano ou todo ano." },
  { tipo: "saude", label: "Saúde e bem-estar", emoji: "🏥", cor: "#0E7C86", desc: "Procedimentos, tratamentos e cuidados." },
  { tipo: "casamento", label: "Casamento", emoji: "💍", cor: "#C8643F", desc: "A festa e tudo que envolve o grande dia." },
  { tipo: "reforma", label: "Reforma da casa", emoji: "🛠️", cor: "#B08537", desc: "Obras e melhorias no seu imóvel." },
  { tipo: "filhos", label: "Filhos", emoji: "👶", cor: "#D98695", desc: "A chegada e a criação dos filhos." },
  { tipo: "intercambio", label: "Intercâmbio", emoji: "🌍", cor: "#3E7CB1", desc: "Estudar ou morar fora por um período." },
  { tipo: "negocio", label: "Abrir um negócio", emoji: "💼", cor: "#1F6F54", desc: "Capital para tirar a empresa do papel." },
  { tipo: "doacao", label: "Doação / causa", emoji: "🤝", cor: "#8A6FB0", recorrentePadrao: true, desc: "Apoiar uma causa de forma recorrente ou pontual." },
  { tipo: "outro", label: "Outro objetivo", emoji: "⭐", cor: "#E2A03F", desc: "Crie o seu — dê o nome e o valor que quiser." },
];
const FALLBACK = TIPOS[TIPOS.length - 1];
const meta = (t: GoalType) => TIPOS.find((x) => x.tipo === t) || FALLBACK;

const num = (v: string) => parseFloat(v) || 0;

const Sonhos = () => {
  const { input, addGoal, updateGoal, removeGoal, plan } = useVidaPlan();
  const anoBase = input.anoAtual;

  return (
    <div className="space-y-6">
      <VPTitle hint="Sonhar é o primeiro passo. Tudo aqui entra no seu Marco Horizonte.">✨ Meus Sonhos</VPTitle>

      <VPCard className="p-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#1b2a3d]/50">Total dos sonhos até a independência</p>
          <p className="font-display text-2xl font-bold text-[#C8643F] tabular-nums">{brl0(plan.totalObjetivos)}</p>
        </div>
      </VPCard>

      <div className="space-y-3">
        {input.goals.map((g) => {
          const m = meta(g.tipo);
          const isImovel = g.tipo === "imovel";
          const isCarro = g.tipo === "carro";
          const podeRecorrer = !isImovel && !isCarro;
          const recorrente = podeRecorrer ? (g.recorrente ?? !!m.recorrentePadrao) : false;
          const notasAberta = g.obs !== undefined;
          return (
            <VPCard key={g.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ backgroundColor: `${m.cor}1a` }}>
                  {m.emoji}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={g.nome ?? ""}
                      placeholder={m.label}
                      onChange={(e) => updateGoal(g.id, { nome: e.target.value })}
                      className="flex-1 bg-transparent font-semibold text-[#16314f] outline-none border-b border-transparent focus:border-[#C8643F]/40 pb-0.5"
                    />
                    <button onClick={() => removeGoal(g.id)} className="text-[#1b2a3d]/30 hover:text-[#C8643F] transition-colors" title="Remover objetivo">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <Mini label="Tipo">
                      <select
                        value={g.tipo}
                        onChange={(e) => updateGoal(g.id, { tipo: e.target.value as GoalType })}
                        className="w-full bg-transparent text-sm text-[#16314f] outline-none cursor-pointer"
                      >
                        {TIPOS.map((t) => <option key={t.tipo} value={t.tipo}>{t.emoji} {t.label}</option>)}
                      </select>
                    </Mini>
                    <Mini label={recorrente ? "Valor por ano" : "Valor"}>
                      <input type="number" value={g.valor} onChange={(e) => updateGoal(g.id, { valor: num(e.target.value) })}
                        className="w-full bg-transparent text-sm text-[#16314f] outline-none tabular-nums" />
                    </Mini>
                    {!recorrente && (
                      <Mini label={isCarro ? "1ª compra (ano)" : "Ano"}>
                        <input type="number" value={g.ano ?? anoBase} onChange={(e) => updateGoal(g.id, { ano: num(e.target.value) })}
                          className="w-full bg-transparent text-sm text-[#16314f] outline-none tabular-nums" />
                      </Mini>
                    )}
                    {isCarro && (
                      <Mini label="Troca a cada (anos)">
                        <input type="number" value={g.intervaloAnos ?? 5} onChange={(e) => updateGoal(g.id, { intervaloAnos: num(e.target.value) })}
                          className="w-full bg-transparent text-sm text-[#16314f] outline-none tabular-nums" />
                      </Mini>
                    )}
                  </div>

                  {/* Recorrência — o cliente decide se é todo ano ou num ano só */}
                  {podeRecorrer && (
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] uppercase tracking-wider text-[#1b2a3d]/40">Quando acontece</p>
                      <div className="inline-flex rounded-lg border border-black/[0.08] p-0.5 bg-black/[0.02]">
                        <Toggle ativo={recorrente} onClick={() => updateGoal(g.id, { recorrente: true })}>Todo ano</Toggle>
                        <Toggle ativo={!recorrente} onClick={() => updateGoal(g.id, { recorrente: false, ano: g.ano ?? anoBase + 3 })}>Em um ano</Toggle>
                      </div>
                    </div>
                  )}

                  {isImovel && (
                    <label className="flex items-center gap-2 text-xs text-[#1b2a3d]/70 flex-wrap">
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

                  {/* Observação livre + dica do tipo */}
                  {notasAberta ? (
                    <input
                      value={g.obs ?? ""}
                      autoFocus
                      placeholder="Anote um detalhe deste sonho…"
                      onChange={(e) => updateGoal(g.id, { obs: e.target.value })}
                      onBlur={(e) => { if (!e.target.value) updateGoal(g.id, { obs: undefined }); }}
                      className="w-full text-sm text-[#16314f] bg-[#16314f]/[0.03] rounded-lg px-3 py-2 outline-none border border-transparent focus:border-[#C8643F]/40"
                    />
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-[#1b2a3d]/50">{m.desc}</p>
                      <button onClick={() => updateGoal(g.id, { obs: "" })} className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-[#16314f]/70 hover:text-[#C8643F] transition-colors">
                        <StickyNote className="h-3.5 w-3.5" /> Nota
                      </button>
                    </div>
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
      <p className="text-center text-xs text-[#1b2a3d]/45 -mt-2">
        Escolha um tipo pronto ou use <strong className="font-semibold text-[#1b2a3d]/60">Outro objetivo</strong> e crie o seu. Tudo é editável a qualquer momento.
      </p>
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

const Toggle = ({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${ativo ? "bg-[#16314f] text-white shadow-sm" : "text-[#1b2a3d]/55 hover:text-[#16314f]"}`}
  >
    {children}
  </button>
);

export default Sonhos;
