// Painel do Consultor — carteira de clientes, cada um com seu plano de vida.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { brl0 } from "../state/VidaPlanContext";
import { useConsultor, type Cliente } from "../state/useConsultor";
import { useConsultorPerfil } from "../state/ConsultorPerfil";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { computeLifePlan, computeHealthScore, type LifePlanInput, type GoalType } from "@/lib/lifeplan";
import { TIPOS, metaTipo } from "../lib/goalTypes";
import { exportVidaPlanPDF } from "../lib/pdf";
import { VPCard, VPTitle, VPField, VPProgress } from "../components/ui";
import { Plus, Trash2, ArrowLeft, MessageCircle, Mail, FileDown, Users, Palette, ChevronRight, BadgeCheck, Link2, FolderPen, Loader2, Share2, Lock } from "lucide-react";

const db = supabase as unknown as { from: (t: string) => any };
const APP_URL = "https://vidaplan-novare.vercel.app";
// Configure aqui o checkout do Plano Consultor (Hotmart/Kiwify). Vazio = fallback WhatsApp.
const CONSULTOR_CHECKOUT_URL = "";
const CONSULTOR_WHATS = "5519983402827";
const corScore = (s: number) => (s >= 80 ? "#2F8F6B" : s >= 60 ? "#3FA0A0" : s >= 40 ? "#E2A03F" : "#C8643F");
const num = (v: string) => parseFloat(v) || 0;
const selAll = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

interface Vinculado { cliente_id: string; cliente_nome: string | null; snapshot: LifePlanInput }

const Clientes = () => {
  const { clientes, addCliente, updateCliente, updateInput, removeCliente } = useConsultor();
  const { isConsultor, hydrated, codigo, salvarCodigo, consultorAtivo, planoStatus, diasTrial } = useConsultorPerfil();
  const { user } = useAuth();
  const [sel, setSel] = useState<string | null>(null);
  const [vinculados, setVinculados] = useState<Vinculado[]>([]);
  const [novoCod, setNovoCod] = useState("");
  const [savingCod, setSavingCod] = useState(false);
  const [codMsg, setCodMsg] = useState<string | null>(null);
  const atual = clientes.find((c) => c.id === sel) || null;

  const virarConsultor = async () => {
    setSavingCod(true); setCodMsg(null);
    const r = await salvarCodigo(novoCod);
    if (!r.ok) setCodMsg(r.erro ?? "Não foi possível salvar.");
    setSavingCod(false);
  };

  const convidarCliente = async () => {
    const texto = `Te convido pro Novare Vida Plan — monte seu projeto de vida. Use meu código de consultor: ${codigo}\n${APP_URL}`;
    try { if (navigator.share) { await navigator.share({ title: "Novare Vida Plan", text: texto, url: APP_URL }); return; } } catch { /* cancelou */ }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  };
  const assinar = () => {
    if (CONSULTOR_CHECKOUT_URL) {
      const sep = CONSULTOR_CHECKOUT_URL.includes("?") ? "&" : "?";
      const url = user ? `${CONSULTOR_CHECKOUT_URL}${sep}src=${user.id}&plano=consultor` : CONSULTOR_CHECKOUT_URL;
      window.open(url, "_blank"); return;
    }
    window.open(`https://wa.me/${CONSULTOR_WHATS}?text=${encodeURIComponent("Quero assinar o Plano Consultor do Vida Plan.")}`, "_blank");
  };

  useEffect(() => {
    if (!isConsultor) return;
    let cancel = false;
    (async () => {
      try {
        const { data } = await db.from("vidaplan_vinculos").select("cliente_id,cliente_nome,snapshot").order("updated_at", { ascending: false });
        if (!cancel && Array.isArray(data)) setVinculados(data.filter((v: any) => v.snapshot) as Vinculado[]);
      } catch { /* tabela ausente */ }
    })();
    return () => { cancel = true; };
  }, [isConsultor]);

  if (atual) {
    return <Detalhe cliente={atual} onBack={() => setSel(null)}
      updateCliente={(patch) => updateCliente(atual.id, patch)}
      updateInput={(patch) => updateInput(atual.id, patch)} />;
  }

  // Quem não registrou um código ainda não é consultor → cria o código aqui mesmo.
  if (hydrated && !isConsultor) {
    return (
      <div className="space-y-6">
        <VPTitle hint="Atenda vários clientes — cada um com o próprio projeto de vida.">👥 Painel do Consultor</VPTitle>

        {/* Pitch: vender o app como ferramenta white-label do consultor */}
        <VPCard className="p-6 bg-[#16314f] text-white">
          <p className="font-display text-2xl font-bold leading-tight">Atenda seus clientes<br />com a <span className="text-[#E29578]">sua marca</span>.</p>
          <p className="text-sm text-white/65 mt-2 max-w-md">Transforme o Vida Plan na ferramenta da sua consultoria: seu logo, sua carteira de clientes e relatórios profissionais — cada cliente com o próprio projeto de vida.</p>
          <div className="mt-4 grid sm:grid-cols-3 gap-2">
            {[["🎨", "Sua marca", "logo no app e no PDF"], ["👥", "Seus clientes", "carteira só sua, isolada"], ["📄", "Relatórios", "PDF com a sua identidade"]].map(([e, t, d]) => (
              <div key={t} className="rounded-xl bg-white/[0.07] px-3 py-2.5">
                <p className="text-lg leading-none">{e}</p>
                <p className="text-sm font-semibold mt-1">{t}</p>
                <p className="text-[11px] text-white/50">{d}</p>
              </div>
            ))}
          </div>
        </VPCard>

        <VPCard className="p-6">
          <div className="text-center mb-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2F8F6B]/12 text-[#2F8F6B] text-xs font-bold px-3 py-1 mb-3">✨ 14 dias grátis</span>
            <p className="font-display text-xl font-bold text-[#16314f]">Crie seu código e comece</p>
            <p className="text-sm text-[#1b2a3d]/60 mt-1 max-w-md mx-auto">
              É o código que seus clientes digitam pra te vincular. Eles aparecem aqui automaticamente, com o número de vida de cada um.
            </p>
          </div>
          <div className="max-w-sm mx-auto">
            <label className="text-xs font-semibold text-[#1b2a3d]/70">Seu código de consultor</label>
            <div className="mt-1 flex flex-col sm:flex-row gap-2">
              <input value={novoCod} onChange={(e) => setNovoCod(e.target.value.toUpperCase())} placeholder="Ex.: NOVARE2026"
                onKeyDown={(e) => e.key === "Enter" && virarConsultor()}
                className="flex-1 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-mono tracking-wide text-[#16314f] outline-none focus:border-[#C8643F] placeholder:font-sans placeholder:tracking-normal placeholder:text-[#1b2a3d]/30" />
              <button onClick={virarConsultor} disabled={savingCod || novoCod.trim().length < 3}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#16314f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d3e63] disabled:opacity-50 transition-colors">
                {savingCod && <Loader2 className="h-4 w-4 animate-spin" />} Começar teste grátis
              </button>
            </div>
            {codMsg && <p className="text-xs text-[#C8643F] mt-2">{codMsg}</p>}
            <p className="text-[11px] text-[#1b2a3d]/45 mt-4 text-center">É só um cliente comum? Pode ignorar — isto é opcional e você segue usando o app normalmente.</p>
          </div>
        </VPCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <VPTitle hint="Aqui estão os planos dos seus CLIENTES. O seu plano pessoal continua nos menus Painel, Meus Sonhos, etc.">👥 Painel do Consultor</VPTitle>

      {/* Plano Consultor + código + convidar */}
      <VPCard className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Link2 className="h-4 w-4 text-[#2F8F6B] shrink-0" />
            <p className="text-sm text-[#1b2a3d]/70 truncate">Seu código: <span className="font-mono font-bold text-[#16314f] bg-[#16314f]/[0.06] rounded px-2 py-0.5">{codigo}</span></p>
            <button onClick={() => { try { navigator.clipboard.writeText(codigo ?? ""); } catch { /* */ } }}
              className="text-xs font-semibold text-[#16314f] hover:text-[#C8643F] shrink-0">copiar</button>
          </div>
          {planoStatus === "trial" && diasTrial != null && (
            <span className="text-[11px] font-bold rounded-full bg-[#E2A03F]/15 text-[#B0760F] px-2.5 py-1">Plano Consultor · teste {diasTrial}d</span>
          )}
          {planoStatus === "active" && <span className="text-[11px] font-bold rounded-full bg-[#2F8F6B]/12 text-[#2F8F6B] px-2.5 py-1">Plano Consultor · ativo</span>}
          {planoStatus === "inactive" && <span className="text-[11px] font-bold rounded-full bg-[#C8643F]/12 text-[#C8643F] px-2.5 py-1">Plano Consultor · expirado</span>}
        </div>
        <button onClick={convidarCliente}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#E29578] px-4 py-2.5 text-sm font-semibold text-[#16314f] hover:bg-[#eaa98e] transition-colors">
          <Share2 className="h-4 w-4" /> Convidar cliente
        </button>
      </VPCard>

      {!consultorAtivo ? (
        <VPCard className="p-8 text-center">
          <div className="h-12 w-12 rounded-2xl bg-[#C8643F]/10 flex items-center justify-center mx-auto mb-3"><Lock className="h-6 w-6 text-[#C8643F]" /></div>
          <p className="font-display text-lg font-bold text-[#16314f]">Seu teste do Plano Consultor terminou</p>
          <p className="text-sm text-[#1b2a3d]/55 mt-1 mb-4 max-w-md mx-auto">Assine para continuar atendendo seus clientes com a sua marca, relatórios e carteira completa.</p>
          <button onClick={assinar} className="inline-flex items-center gap-1.5 rounded-xl bg-[#16314f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1d3e63]">
            <BadgeCheck className="h-4 w-4" /> Assinar Plano Consultor
          </button>
        </VPCard>
      ) : (
      <>
      {/* Clientes vinculados (logins reais que digitaram seu código) */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="h-4 w-4 text-[#2F8F6B]" />
          <p className="font-display text-base font-bold text-[#16314f]">Clientes vinculados</p>
          <span className="text-xs text-[#1b2a3d]/45">{vinculados.length}</span>
        </div>
        {vinculados.length === 0 ? (
          <VPCard className="p-5"><p className="text-sm text-[#1b2a3d]/55">Ninguém vinculado ainda. Compartilhe seu código <strong className="font-mono text-[#16314f]">{codigo}</strong> com seus clientes.</p></VPCard>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {vinculados.map((v) => <VinculadoCard key={v.cliente_id} v={v} />)}
          </div>
        )}
      </div>

      {/* Rascunhos locais (prospects que você monta) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FolderPen className="h-4 w-4 text-[#C8643F]" />
            <p className="font-display text-base font-bold text-[#16314f]">Rascunhos</p>
            <span className="text-xs text-[#1b2a3d]/45">{clientes.length}</span>
          </div>
          <button onClick={() => { const c = addCliente("Novo cliente"); setSel(c.id); }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#16314f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d3e63] transition-colors">
            <Plus className="h-4 w-4" /> Novo cliente
          </button>
        </div>
        {clientes.length === 0 ? (
          <VPCard className="p-5"><p className="text-sm text-[#1b2a3d]/55">Monte planos de prospects aqui, mesmo sem login deles. Salva na sua conta.</p></VPCard>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {clientes.map((c) => <ClienteCard key={c.id} cliente={c} onOpen={() => setSel(c.id)} onRemove={() => removeCliente(c.id)} />)}
          </div>
        )}
      </div>
      </>
      )}

      <p className="text-center text-xs text-[#1b2a3d]/45">
        Configure sua identidade (logo e nome) em{" "}
        <Link to="/vidaplan/app/marca" className="font-semibold text-[#16314f] hover:text-[#C8643F]">Minha Marca</Link>.
      </p>
    </div>
  );
};

const VinculadoCard = ({ v }: { v: Vinculado }) => {
  const plan = useMemo(() => computeLifePlan(v.snapshot), [v.snapshot]);
  const saude = useMemo(() => computeHealthScore(v.snapshot, plan), [v.snapshot, plan]);
  const pct = Math.min(100, Math.round(plan.pctAtingido));
  return (
    <VPCard className="p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-[#2F8F6B] text-white flex items-center justify-center font-bold shrink-0">
          {(v.cliente_nome?.trim()[0] || "C").toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-[#16314f] truncate">{v.cliente_nome || "Cliente"}</p>
          <p className="text-xs text-[#1b2a3d]/50">vinculado · {v.snapshot.idadeAtual} anos</p>
        </div>
      </div>
      <p className="text-[10px] uppercase tracking-wider text-[#1b2a3d]/50 mt-3">Número da vida</p>
      <p className="font-display text-xl font-bold text-[#16314f] tabular-nums">{brl0(plan.capitalDeVida)}</p>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex-1"><VPProgress pct={pct} tone={plan.viavel ? "green" : "terracota"} /></div>
        <span className="text-xs font-semibold tabular-nums" style={{ color: plan.viavel ? "#2F8F6B" : "#C8643F" }}>{pct}%</span>
        <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ color: corScore(saude.total), backgroundColor: `${corScore(saude.total)}1a` }}>Saúde {saude.total}</span>
      </div>
      <button onClick={() => exportVidaPlanPDF(v.snapshot, plan, v.cliente_nome || undefined)}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#16314f] hover:text-[#C8643F]">
        <FileDown className="h-3.5 w-3.5" /> Exportar PDF
      </button>
    </VPCard>
  );
};

const ClienteCard = ({ cliente, onOpen, onRemove }: { cliente: Cliente; onOpen: () => void; onRemove: () => void }) => {
  const plan = useMemo(() => computeLifePlan(cliente.input), [cliente.input]);
  const saude = useMemo(() => computeHealthScore(cliente.input, plan), [cliente.input, plan]);
  const pct = Math.min(100, Math.round(plan.pctAtingido));
  return (
    <VPCard className="p-4 hover:border-[#C8643F]/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <button onClick={onOpen} className="flex items-center gap-3 text-left min-w-0 flex-1">
          <div className="h-10 w-10 rounded-full bg-[#16314f] text-white flex items-center justify-center font-bold shrink-0">
            {(cliente.nome.trim()[0] || "C").toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[#16314f] truncate">{cliente.nome || "Sem nome"}</p>
            <p className="text-xs text-[#1b2a3d]/50 truncate">{cliente.cidade || `${cliente.input.idadeAtual} anos`}</p>
          </div>
        </button>
        <button onClick={(e) => { e.stopPropagation(); if (confirm(`Remover ${cliente.nome}?`)) onRemove(); }}
          className="text-[#1b2a3d]/25 hover:text-[#C8643F] shrink-0"><Trash2 className="h-4 w-4" /></button>
      </div>
      <button onClick={onOpen} className="w-full text-left mt-3">
        <p className="text-[10px] uppercase tracking-wider text-[#1b2a3d]/50">Número da vida</p>
        <p className="font-display text-xl font-bold text-[#16314f] tabular-nums">{brl0(plan.capitalDeVida)}</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex-1"><VPProgress pct={pct} tone={plan.viavel ? "green" : "terracota"} /></div>
          <span className="text-xs font-semibold tabular-nums" style={{ color: plan.viavel ? "#2F8F6B" : "#C8643F" }}>{pct}%</span>
          <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ color: corScore(saude.total), backgroundColor: `${corScore(saude.total)}1a` }}>Saúde {saude.total}</span>
        </div>
      </button>
    </VPCard>
  );
};

const RENT = [2, 3, 4, 5, 6, 7];

const Detalhe = ({ cliente, onBack, updateCliente, updateInput }: {
  cliente: Cliente; onBack: () => void;
  updateCliente: (patch: Partial<Cliente>) => void;
  updateInput: (patch: Partial<LifePlanInput>) => void;
}) => {
  const inp = cliente.input;
  const plan = useMemo(() => computeLifePlan(inp), [inp]);
  const saude = useMemo(() => computeHealthScore(inp, plan), [inp, plan]);
  const pct = Math.min(100, Math.round(plan.pctAtingido));

  const tel = (cliente.telefone ?? "").replace(/\D/g, "");
  const whats = tel ? (tel.startsWith("55") ? tel : `55${tel}`) : "";

  const setGoals = (goals: LifePlanInput["goals"]) => updateInput({ goals });
  const addSonho = () => setGoals([...inp.goals, { id: Date.now(), tipo: "outro", nome: "", valor: 30000, ano: inp.anoAtual + 3 }]);
  const updSonho = (id: number, patch: Partial<LifePlanInput["goals"][number]>) => setGoals(inp.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  const exportar = async () => { await exportVidaPlanPDF(inp, plan, cliente.nome); };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#16314f] hover:text-[#C8643F]">
        <ArrowLeft className="h-4 w-4" /> Meus clientes
      </button>

      {/* Cabeçalho do cliente */}
      <VPCard className="p-5">
        <div className="grid sm:grid-cols-2 gap-3">
          <Txt label="Nome" value={cliente.nome} onChange={(v) => updateCliente({ nome: v })} placeholder="Nome do cliente" />
          <Txt label="Cidade" value={cliente.cidade ?? ""} onChange={(v) => updateCliente({ cidade: v })} placeholder="Cidade - UF" />
          <Txt label="WhatsApp" value={cliente.telefone ?? ""} onChange={(v) => updateCliente({ telefone: v })} placeholder="(19) 98340-2827" />
          <Txt label="E-mail" value={cliente.email ?? ""} onChange={(v) => updateCliente({ email: v })} placeholder="cliente@email.com" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {whats && <a href={`https://wa.me/${whats}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#2F8F6B] px-3 py-2 text-sm font-semibold text-white hover:bg-[#27795a]"><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
          {cliente.email && <a href={`mailto:${cliente.email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold text-[#16314f] hover:bg-black/[0.03]"><Mail className="h-4 w-4" /> E-mail</a>}
          <button onClick={exportar} className="inline-flex items-center gap-1.5 rounded-lg bg-[#16314f] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1d3e63]"><FileDown className="h-4 w-4" /> Exportar PDF</button>
        </div>
      </VPCard>

      {/* Resumo */}
      <VPCard className="p-5 bg-[#16314f] text-white">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Número da vida</p>
        <p className="font-display text-3xl font-bold tabular-nums mt-1">{brl0(plan.capitalDeVida)}</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/10 px-3 py-2"><p className="text-[10px] uppercase tracking-wider text-white/50">Independência</p><p className="font-display text-base font-bold tabular-nums">{brl0(plan.alvoAposentadoria)}</p></div>
          <div className="rounded-xl bg-white/10 px-3 py-2"><p className="text-[10px] uppercase tracking-wider text-white/50">Sonhos</p><p className="font-display text-base font-bold tabular-nums">{brl0(plan.totalObjetivos)}</p></div>
          <div className="rounded-xl bg-white/10 px-3 py-2"><p className="text-[10px] uppercase tracking-wider text-white/50">Saúde</p><p className="font-display text-base font-bold tabular-nums" style={{ color: corScore(saude.total) }}>{saude.total} · {saude.nota}</p></div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1"><VPProgress pct={pct} tone={plan.viavel ? "green" : "terracota"} /></div>
          <span className="text-sm font-semibold tabular-nums" style={{ color: plan.viavel ? "#7FE3C0" : "#E29578" }}>{pct}%</span>
        </div>
      </VPCard>

      {/* Dados do plano */}
      <VPCard className="p-5">
        <p className="font-display text-base font-bold text-[#16314f] mb-3">Dados do plano</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <VPField label="Idade atual" value={inp.idadeAtual} onChange={(v) => updateInput({ idadeAtual: v })} />
          <VPField label="Idade da independência" value={inp.idadeAposentadoria} onChange={(v) => updateInput({ idadeAposentadoria: v })} />
          <VPField label="Expectativa de vida" value={inp.idadeFim} onChange={(v) => updateInput({ idadeFim: v })} />
          <VPField label="Renda mensal" suffix="R$/mês" value={inp.rendaMensal} step={100} onChange={(v) => updateInput({ rendaMensal: v })} />
          <VPField label="Custo fixo mensal" suffix="R$/mês" value={inp.custoFixoMensal} step={100} onChange={(v) => updateInput({ custoFixoMensal: v })} />
          <VPField label="Patrimônio investido" suffix="R$" value={inp.patrimonioAtual} step={1000} onChange={(v) => updateInput({ patrimonioAtual: v })} />
          <VPField label="Renda desejada na indep." suffix="R$/mês" value={inp.rendaAposDesejada} step={100} onChange={(v) => updateInput({ rendaAposDesejada: v })} />
          <VPField label="Renda já garantida (INSS)" suffix="R$/mês" value={inp.rendaINSS} step={100} onChange={(v) => updateInput({ rendaINSS: v })} />
        </div>
        <div className="mt-4">
          <p className="text-xs font-semibold text-[#1b2a3d]/70 mb-1.5">Rentabilidade do projeto</p>
          <div className="flex flex-wrap gap-2">
            {RENT.map((r) => (
              <button key={r} onClick={() => updateInput({ rentRealPct: r })}
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${Math.abs(inp.rentRealPct - r) < 0.05 ? "border-[#C8643F] bg-[#C8643F]/[0.06] text-[#C8643F]" : "border-black/10 text-[#16314f] hover:border-[#16314f]/30"}`}>
                IPCA + {r}%
              </button>
            ))}
          </div>
        </div>
      </VPCard>

      {/* Sonhos do cliente */}
      <VPCard className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-display text-base font-bold text-[#16314f]">Sonhos</p>
          <span className="text-sm font-semibold text-[#C8643F] tabular-nums">{brl0(plan.totalObjetivos)}</span>
        </div>
        {inp.goals.length === 0 ? (
          <p className="text-sm text-[#1b2a3d]/50 mb-3">Nenhum sonho ainda.</p>
        ) : (
          <div className="space-y-2 mb-3">
            {inp.goals.map((g) => {
              const mt = metaTipo(g.tipo);
              return (
                <div key={g.id} className="flex items-center gap-2 rounded-xl border border-black/[0.07] p-2">
                  <span className="text-lg shrink-0">{mt.emoji}</span>
                  <select value={g.tipo} onChange={(e) => updSonho(g.id, { tipo: e.target.value as GoalType })}
                    className="bg-transparent text-sm text-[#16314f] outline-none cursor-pointer max-w-[110px]">
                    {TIPOS.map((t) => <option key={t.tipo} value={t.tipo}>{t.label}</option>)}
                  </select>
                  <input value={g.nome ?? ""} placeholder={mt.label} onChange={(e) => updSonho(g.id, { nome: e.target.value })}
                    className="flex-1 min-w-0 bg-transparent text-sm text-[#16314f] outline-none border-b border-transparent focus:border-[#C8643F]/40" />
                  <div className="flex items-center rounded-lg border border-black/10 px-2 shrink-0">
                    <span className="text-[10px] text-[#1b2a3d]/40">R$</span>
                    <input type="number" value={g.valor} onFocus={selAll} onChange={(e) => updSonho(g.id, { valor: num(e.target.value) })}
                      className="w-20 bg-transparent py-1.5 pl-1 text-sm text-right text-[#16314f] outline-none tabular-nums" />
                  </div>
                  <button onClick={() => setGoals(inp.goals.filter((x) => x.id !== g.id))} className="text-[#1b2a3d]/25 hover:text-[#C8643F] shrink-0"><Trash2 className="h-4 w-4" /></button>
                </div>
              );
            })}
          </div>
        )}
        <button onClick={addSonho} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#16314f] hover:text-[#C8643F]">
          <Plus className="h-4 w-4" /> Adicionar sonho
        </button>
      </VPCard>

      {/* Saúde financeira do cliente */}
      <VPCard className="p-5">
        <p className="font-display text-base font-bold text-[#16314f] mb-3">Saúde financeira</p>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
          {saude.pilares.map((p) => (
            <div key={p.key}>
              <div className="flex justify-between text-xs mb-1"><span className="text-[#16314f]">{p.nome}</span><span className="tabular-nums text-[#1b2a3d]/55">{p.score}</span></div>
              <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${p.score}%`, backgroundColor: corScore(p.score) }} /></div>
            </div>
          ))}
        </div>
      </VPCard>

      <Link to="/vidaplan/app/marca" className="flex items-center justify-between rounded-2xl border border-black/[0.07] bg-white px-4 py-3 hover:border-[#C8643F]/40 transition-colors">
        <span className="flex items-center gap-2 text-sm font-semibold text-[#16314f]"><Palette className="h-4 w-4 text-[#C8643F]" /> Personalizar minha marca no relatório</span>
        <ChevronRight className="h-4 w-4 text-[#1b2a3d]/30" />
      </Link>
    </div>
  );
};

const Txt = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <label className="block">
    <span className="text-xs font-semibold text-[#1b2a3d]/70">{label}</span>
    <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#16314f] outline-none focus:border-[#C8643F] placeholder:text-[#1b2a3d]/30" />
  </label>
);

export default Clientes;
