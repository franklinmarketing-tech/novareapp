// Meus Sonhos: os objetivos de vida que compõem o Marco Horizonte.
import { useEffect, useMemo, useRef, useState } from "react";
import { useVidaPlan, brl0 } from "../state/VidaPlanContext";
import { VPCard, VPTitle, VPMoney } from "../components/ui";
import { projecaoObjetivo, sugestaoImovel, type GoalType } from "@/lib/lifeplan";
import { TIPOS, metaTipo as meta } from "../lib/goalTypes";
import { Plus, Trash2, StickyNote, Pencil, Lightbulb } from "lucide-react";

const num = (v: string) => parseFloat(v) || 0;
const selAll = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

const Sonhos = () => {
  const { input, addGoal, updateGoal, removeGoal, plan } = useVidaPlan();
  const anoBase = input.anoAtual;

  // Foca o campo de nome assim que o cliente cria um objetivo novo.
  const lastNameRef = useRef<HTMLInputElement>(null);
  const [focusNew, setFocusNew] = useState(false);
  useEffect(() => {
    if (focusNew) { lastNameRef.current?.focus(); setFocusNew(false); }
  }, [focusNew]);

  // Resumo por categoria: soma a projeção de cada objetivo até a independência.
  const resumo = useMemo(() => {
    const mapa = new Map<GoalType, { total: number; count: number }>();
    for (const g of input.goals) {
      const p = projecaoObjetivo(g, input.anoAtual, input.idadeAtual, input.idadeAposentadoria);
      const cur = mapa.get(g.tipo) ?? { total: 0, count: 0 };
      mapa.set(g.tipo, { total: cur.total + p.total, count: cur.count + 1 });
    }
    return [...mapa.entries()].map(([tipo, v]) => ({ tipo, ...v })).sort((a, b) => b.total - a.total);
  }, [input.goals, input.anoAtual, input.idadeAtual, input.idadeAposentadoria]);

  return (
    <div className="space-y-6">
      <VPTitle hint="Sonhar é o primeiro passo. Tudo aqui entra no seu Marco Horizonte.">✨ Meus Sonhos</VPTitle>

      <VPCard className="p-5">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#1b2a3d]/50">Total dos sonhos até a independência</p>
            <p className="font-display text-2xl font-bold text-[#C8643F] tabular-nums">{brl0(plan.totalObjetivos)}</p>
          </div>
          <p className="text-xs text-[#1b2a3d]/45">{input.goals.length} objetivo{input.goals.length === 1 ? "" : "s"}</p>
        </div>
        {resumo.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {resumo.map((r) => {
              const m = meta(r.tipo);
              return (
                <div key={r.tipo} className="rounded-xl border border-black/[0.06] p-3" style={{ borderLeft: `3px solid ${m.cor}` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-lg leading-none">{m.emoji}</span>
                    <span className="text-[10px] text-[#1b2a3d]/40">{r.count}×</span>
                  </div>
                  <p className="font-display text-base font-bold text-[#16314f] tabular-nums mt-1.5">{brl0(r.total)}</p>
                  <p className="text-[11px] text-[#1b2a3d]/55 truncate">{m.label}</p>
                </div>
              );
            })}
          </div>
        )}
      </VPCard>

      <div className="space-y-3">
        {input.goals.map((g, i) => {
          const m = meta(g.tipo);
          const isImovel = g.tipo === "imovel";
          const isCarro = g.tipo === "carro";
          const isOutro = g.tipo === "outro";
          const podeRecorrer = !isImovel && !isCarro;
          const recorrente = podeRecorrer ? (g.recorrente ?? !!m.recorrentePadrao) : false;
          const notasAberta = g.obs !== undefined;
          const isLast = i === input.goals.length - 1;
          const proj = projecaoObjetivo(g, input.anoAtual, input.idadeAtual, input.idadeAposentadoria);
          const sug = isImovel ? sugestaoImovel(input.rendaMensal, input.patrimonioAtual) : null;
          return (
            <VPCard key={g.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ backgroundColor: `${m.cor}1a` }}>
                  {m.emoji}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        ref={isLast ? lastNameRef : undefined}
                        value={g.nome ?? ""}
                        placeholder={isOutro ? "Dê um nome ao seu objetivo…" : m.label}
                        onChange={(e) => updateGoal(g.id, { nome: e.target.value })}
                        className="w-full bg-transparent font-semibold text-[#16314f] placeholder:text-[#1b2a3d]/35 placeholder:font-normal outline-none border-b border-[#16314f]/15 focus:border-[#C8643F] pb-0.5 pr-6"
                      />
                      <Pencil className="h-3.5 w-3.5 text-[#1b2a3d]/25 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <button onClick={() => removeGoal(g.id)} className="text-[#1b2a3d]/30 hover:text-[#C8643F] transition-colors shrink-0" title="Remover objetivo">
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
                    <Mini label={recorrente ? "Valor por ano (R$)" : "Valor (R$)"}>
                      <VPMoney value={g.valor} onChange={(v) => updateGoal(g.id, { valor: v })}
                        className="w-full bg-transparent text-sm text-[#16314f] outline-none tabular-nums" />
                    </Mini>
                    {!recorrente && (
                      <Mini label={isCarro ? "1ª compra (ano)" : "Ano"}>
                        <input type="number" value={g.ano ?? anoBase} onFocus={selAll} onChange={(e) => updateGoal(g.id, { ano: num(e.target.value) })}
                          className="w-full bg-transparent text-sm text-[#16314f] outline-none tabular-nums" />
                      </Mini>
                    )}
                    {isCarro && (
                      <Mini label="Troca a cada (anos)">
                        <input type="number" value={g.intervaloAnos ?? 5} onFocus={selAll} onChange={(e) => updateGoal(g.id, { intervaloAnos: num(e.target.value) })}
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
                    <>
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
                      {sug && (
                        <div className="rounded-xl border border-[#E2A03F]/30 bg-[#E2A03F]/[0.07] p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Lightbulb className="h-4 w-4 text-[#C8643F]" />
                            <p className="text-xs font-bold text-[#16314f]">Sugestão Novare</p>
                          </div>
                          <p className="text-[11px] text-[#1b2a3d]/55 mb-2">Com base na sua renda e patrimônio (parcela ≤ 30% da renda):</p>
                          <div className="space-y-1.5 text-xs">
                            <SugRow label="À vista (com seu patrimônio)" value={sug.aVista}
                              onUse={() => updateGoal(g.id, { valor: sug.aVista, financiar: false })} />
                            <SugRow label="Financiado (entrada + crédito)" value={sug.financiado}
                              onUse={() => updateGoal(g.id, { valor: sug.financiado, financiar: true, entradaPct: sug.financiado > 0 ? Math.round((sug.entrada / sug.financiado) * 100) : 20 })} />
                            <div className="flex justify-between text-[#1b2a3d]/50 pt-0.5"><span>Entrada possível</span><span className="tabular-nums">{brl0(sug.entrada)}</span></div>
                            <div className="flex justify-between text-[#1b2a3d]/50"><span>Crédito (~{brl0(sug.parcela)}/mês)</span><span className="tabular-nums">{brl0(sug.financiamento)}</span></div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Projeção do objetivo até a independência */}
                  {proj.total > 0 && (
                    <div className="flex items-center justify-between rounded-lg bg-[#2F8F6B]/[0.07] px-3 py-2 text-xs">
                      <span className="text-[#1b2a3d]/60">{recorrente ? "Custo até a independência" : "Impacto no plano"}</span>
                      <span className="font-semibold text-[#16314f] tabular-nums">
                        {brl0(proj.total)}
                        {proj.anoInicio != null && (
                          <span className="text-[#1b2a3d]/45 font-normal"> · {proj.anos > 1 ? `${proj.anoInicio}–${proj.anoFim}` : proj.anoInicio}</span>
                        )}
                      </span>
                    </div>
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
        onClick={() => { addGoal({ tipo: "outro", nome: "", valor: 30000, ano: anoBase + 3 }); setFocusNew(true); }}
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
    <input type="number" value={value} onFocus={selAll} onChange={(e) => onChange(num(e.target.value))}
      className="w-12 bg-white border border-black/10 rounded px-1 py-0.5 text-[#16314f] tabular-nums" />
    {label}
  </span>
);

const SugRow = ({ label, value, onUse }: { label: string; value: number; onUse: () => void }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-[#1b2a3d]/70">{label}</span>
    <span className="flex items-center gap-2 shrink-0">
      <span className="font-semibold text-[#16314f] tabular-nums">{brl0(value)}</span>
      <button onClick={onUse} className="rounded-md bg-[#16314f] px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-[#1d3e63] transition-colors">Usar</button>
    </span>
  </div>
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
