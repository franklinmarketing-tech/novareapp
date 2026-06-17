import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Lock, Unlock, FileDown, Loader2, CalendarCheck2, ChevronDown,
  TrendingUp, TrendingDown, Minus, Trophy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { generateMonthlyClosingPdf } from "@/lib/generateMonthlyClosingPdf";
import { criarSnapshotFechamento } from "./AcompanhamentoMetas";
import { cloneToNextMonth } from "@/lib/monthlyClone";
import { cn } from "@/lib/utils";
import { pushNotification } from "@/hooks/useNotifications";

interface MonthlyClosing {
  id: string;
  client_id: string;
  month_ref: string;
  status: string;
  total_income: number | null;
  total_expenses: number | null;
  total_assets: number | null;
  total_debts: number | null;
  monthly_debt_payments: number | null;
  net_worth: number | null;
  savings_rate: number | null;
  emergency_reserve_months: number | null;
  plan_completion_pct: number | null;
  income_snapshot: any;
  expenses_snapshot: any;
  debts_snapshot: any;
  assets_snapshot: any;
  insurance_snapshot: any;
  goals_snapshot: any;
  action_plan_snapshot: any;
  notes: string | null;
  closed_at: string;
  closed_by: string;
  reopened_at: string | null;
  reopened_by: string | null;
}

interface Props {
  clientId: string;
  clientName?: string;
  isAdmin?: boolean;
}

const fmtBRL = (v: number | null | undefined) =>
  v == null ? "—" : `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
const fmtPct = (v: number | null | undefined) => (v == null ? "—" : `${Number(v).toFixed(1)}%`);

const monthLabel = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(/^\w/, (c) => c.toUpperCase());
};

const firstOfMonth = (year: number, month: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-01`;

const normalizeDateOnly = (value?: string | null) => value?.slice(0, 10) ?? null;

const preferMonthRows = <T extends { month_ref?: string | null }>(rows: T[], monthRef: string): T[] => {
  const exactRows = rows.filter((row) => normalizeDateOnly(row.month_ref) === monthRef);
  if (exactRows.length > 0) return exactRows;
  return rows.filter((row) => !row.month_ref);
};

function Delta({ curr, prev }: { curr: number | null; prev: number | null }) {
  if (curr == null || prev == null) return <span className="text-muted-foreground/40">—</span>;
  const diff = curr - prev;
  const pct = prev !== 0 ? ((diff / Math.abs(prev)) * 100).toFixed(1) : null;
  if (diff > 0) return (
    <span className="flex items-center gap-0.5 text-emerald-600 text-[10px]">
      <TrendingUp className="w-3 h-3" />{pct ? `+${pct}%` : "+"}
    </span>
  );
  if (diff < 0) return (
    <span className="flex items-center gap-0.5 text-rose-600 text-[10px]">
      <TrendingDown className="w-3 h-3" />{pct ? `${pct}%` : "−"}
    </span>
  );
  return <Minus className="w-3 h-3 text-muted-foreground/40" />;
}

export function MonthlyClosings({ clientId, clientName = "Cliente", isAdmin = true }: Props) {
  const [closings, setClosings] = useState<MonthlyClosing[]>([]);
  const [loading, setLoading] = useState(true);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [notes, setNotes] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reopenTarget, setReopenTarget] = useState<MonthlyClosing | null>(null);

  const now = new Date();
  const [targetYear, setTargetYear] = useState(now.getFullYear());
  const [targetMonth, setTargetMonth] = useState(now.getMonth());

  // Metas ativas (para snapshot no fechamento)
  const { data: metas = [] } = useQuery({
    queryKey: ["parecer_metas", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("parecer_metas")
        .select("*")
        .eq("client_id", clientId)
        .is("completed_at", null);
      return data || [];
    },
  });

  // Metas concluidas (para mostrar conquistas no fechamento)
  const { data: metasConcluidas = [] } = useQuery({
    queryKey: ["parecer_metas_concluidas", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("parecer_metas")
        .select("*")
        .eq("client_id", clientId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false });
      return data || [];
    },
  });

  const { data: entradas = [] } = useQuery({
    queryKey: ["acompanhamento_entradas", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("acompanhamento_entradas")
        .select("*")
        .eq("client_id", clientId)
        .order("snapshotted_at", { ascending: false });
      return data || [];
    },
  });

  // Média de progresso das metas por fechamento (closing snapshots)
  const metasPctByClosing = useMemo(() => {
    const map: Record<string, number> = {};
    closings.forEach((c) => {
      const snapshots = entradas.filter(
        (e: any) => e.month_closing_id === c.id && e.progresso_pct != null,
      );
      if (snapshots.length > 0) {
        map[c.id] = Math.round(
          snapshots.reduce((s: number, e: any) => s + Number(e.progresso_pct), 0) / snapshots.length,
        );
      }
    });
    return map;
  }, [closings, entradas]);

  const load = async () => {
    if (!clientId) return;
    const { data, error } = await supabase
      .from("monthly_closings")
      .select("*")
      .eq("client_id", clientId)
      .order("month_ref", { ascending: false });
    if (error) toast.error(error.message);
    setClosings((data as MonthlyClosing[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [clientId]);

  const closedMonths = useMemo(
    () => new Set(closings.filter((c) => c.status === "fechado").map((c) => c.month_ref)),
    [closings],
  );

  const buildSnapshot = async (monthRef: string) => {
    const monthFilter = `month_ref.is.null,month_ref.eq.${monthRef}`;
    const [incRes, expRes, debRes, assRes, insRes, goalsRes, planRes] = await Promise.all([
      supabase.from("income").select("*").eq("client_id", clientId).or(monthFilter),
      supabase.from("expenses").select("*").eq("client_id", clientId).or(monthFilter),
      supabase.from("debts").select("*").eq("client_id", clientId).or(monthFilter),
      supabase.from("assets").select("*").eq("client_id", clientId).or(monthFilter),
      supabase.from("insurance").select("*").eq("client_id", clientId).or(monthFilter),
      supabase.from("goals").select("*").eq("client_id", clientId).or(monthFilter),
      supabase.from("action_plans").select("id").eq("client_id", clientId).maybeSingle(),
    ]);
    const income = preferMonthRows((incRes.data || []) as any[], monthRef);
    const expenses = preferMonthRows((expRes.data || []) as any[], monthRef);
    const debts = preferMonthRows((debRes.data || []) as any[], monthRef);
    const assets = preferMonthRows((assRes.data || []) as any[], monthRef);
    const insurance = preferMonthRows((insRes.data || []) as any[], monthRef);
    const goals = preferMonthRows((goalsRes.data || []) as any[], monthRef);

    const totalIncome = income.reduce((s: number, r: any) => s + (r.frequency === "anual" ? Number(r.amount) / 12 : Number(r.amount) || 0), 0);
    const totalExpenses = expenses.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
    const totalAssets = assets.reduce((s: number, r: any) => s + (Number(r.estimated_value) || 0), 0);
    const totalDebts = debts.reduce((s: number, r: any) => s + (Number(r.total_amount) || 0), 0);
    const monthlyDebtPayments = debts.reduce((s: number, r: any) => s + (Number(r.monthly_payment) || 0), 0);
    const netWorth = totalAssets - totalDebts;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses - monthlyDebtPayments) / totalIncome) * 100 : 0;
    const emergencyMonths = totalExpenses > 0 ? totalAssets / totalExpenses : 0;

    let actionItems: any[] = [];
    let planPct = 0;
    if (planRes.data) {
      const { data: items } = await supabase.from("action_items").select("*").eq("action_plan_id", planRes.data.id).or(monthFilter);
      actionItems = preferMonthRows((items || []) as any[], monthRef);
      if (actionItems.length > 0) planPct = Math.round((actionItems.filter((i) => i.status === "concluido").length / actionItems.length) * 100);
    }
    const parentItems = actionItems.filter((a) => !a.parent_id);
    const goalsSnapshot = goals.map((g: any) => {
      const t = parentItems.filter((a) => a.goal_id === g.id);
      const done = t.filter((a) => a.status === "concluido").length;
      return { id: g.id, description: g.description, priority: g.priority, target_amount: g.target_amount, deadline: g.deadline, tasksDone: done, tasksTotal: t.length, pct: t.length > 0 ? Math.round((done / t.length) * 100) : 0 };
    });

    return {
      totals: { total_income: totalIncome, total_expenses: totalExpenses, total_assets: totalAssets, total_debts: totalDebts, monthly_debt_payments: monthlyDebtPayments, net_worth: netWorth, savings_rate: savingsRate, emergency_reserve_months: emergencyMonths, plan_completion_pct: planPct },
      income, expenses, debts, assets, insurance, goalsSnapshot, actionItems,
    };
  };

  const handleClose = async () => {
    setClosing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão inválida.");
      const monthRef = firstOfMonth(targetYear, targetMonth);
      const snap = await buildSnapshot(monthRef);

      const { data: existing } = await supabase.from("monthly_closings").select("id").eq("client_id", clientId).eq("month_ref", monthRef).maybeSingle();

      const payload = {
        client_id: clientId, month_ref: monthRef, status: "fechado",
        ...snap.totals,
        income_snapshot: snap.income, expenses_snapshot: snap.expenses,
        debts_snapshot: snap.debts, assets_snapshot: snap.assets,
        insurance_snapshot: snap.insurance, goals_snapshot: snap.goalsSnapshot,
        action_plan_snapshot: snap.actionItems,
        notes: notes.trim() || null, closed_by: user.id,
        closed_at: new Date().toISOString(), reopened_at: null, reopened_by: null,
      };

      let closingId = existing?.id;
      if (existing) {
        await supabase.from("monthly_closings").update(payload).eq("id", existing.id);
      } else {
        const { data: inserted, error } = await supabase.from("monthly_closings").insert(payload).select("id").single();
        if (error) throw error;
        closingId = inserted.id;
      }

      // Snapshot das metas de acompanhamento vinculadas ao fechamento
      if (closingId) {
        await criarSnapshotFechamento(clientId, closingId, metas as any, entradas as any);
      }

      // Clona itens do mês fechado para o próximo mês (novo "onboarding mensal")
      const cloneResult = await cloneToNextMonth(clientId, monthRef);
      const totalCloned = Object.values(cloneResult).reduce((a, b) => a + b, 0);

      toast.success("Mês fechado!", {
        description: totalCloned > 0
          ? `${totalCloned} item${totalCloned !== 1 ? "ns" : ""} copiado${totalCloned !== 1 ? "s" : ""} para o próximo mês — pronto para o consultor revisar.`
          : "Snapshot registrado. (Próximo mês já tinha registros — nada copiado.)",
        duration: 6000,
      });

      // Notifica o cliente que o mês foi fechado
      try {
        const { data: clientRow } = await supabase
          .from("clients")
          .select("user_id")
          .eq("id", clientId)
          .maybeSingle();
        if (clientRow?.user_id && clientRow.user_id !== user.id) {
          await pushNotification({
            user_id: clientRow.user_id,
            type: "mes_fechado",
            title: "Mês fechado pelo seu consultor",
            body: "O fechamento do mês foi concluído. Veja sua evolução no dashboard.",
            link: "/cliente",
          });
        }
      } catch {
        /* notificação é best-effort */
      }

      setCloseOpen(false);
      setNotes("");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Falha ao fechar o mês");
    } finally {
      setClosing(false);
    }
  };

  const handleRefreshClose = async (existing: MonthlyClosing) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão inválida.");
      const snap = await buildSnapshot(existing.month_ref);
      await supabase.from("monthly_closings").update({
        status: "fechado", ...snap.totals,
        income_snapshot: snap.income, expenses_snapshot: snap.expenses,
        debts_snapshot: snap.debts, assets_snapshot: snap.assets,
        insurance_snapshot: snap.insurance, goals_snapshot: snap.goalsSnapshot,
        action_plan_snapshot: snap.actionItems,
        closed_at: new Date().toISOString(), closed_by: user.id,
        reopened_at: null, reopened_by: null,
      }).eq("id", existing.id);
      await criarSnapshotFechamento(clientId, existing.id, metas as any, entradas as any);
      toast.success("Mês fechado novamente.");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Falha ao refechar");
    }
  };

  const handleReopen = async () => {
    if (!reopenTarget) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("monthly_closings").update({ status: "reaberto", reopened_at: new Date().toISOString(), reopened_by: user?.id }).eq("id", reopenTarget.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Mês reaberto.");
    setReopenTarget(null);
    await load();
  };

  const handlePdf = async (c: MonthlyClosing) => {
    await generateMonthlyClosingPdf({
      clientName, monthLabel: monthLabel(c.month_ref),
      closedAt: new Date(c.closed_at).toLocaleString("pt-BR"),
      notes: c.notes,
      totals: { total_income: Number(c.total_income) || 0, total_expenses: Number(c.total_expenses) || 0, total_assets: Number(c.total_assets) || 0, total_debts: Number(c.total_debts) || 0, monthly_debt_payments: Number(c.monthly_debt_payments) || 0, net_worth: Number(c.net_worth) || 0, savings_rate: Number(c.savings_rate) || 0, emergency_reserve_months: Number(c.emergency_reserve_months) || 0, plan_completion_pct: Number(c.plan_completion_pct) || 0 },
      income: c.income_snapshot || [], expenses: c.expenses_snapshot || [],
      debts: c.debts_snapshot || [], assets: c.assets_snapshot || [],
      insurance: c.insurance_snapshot || [], goals: c.goals_snapshot || [],
      actionItems: (c.action_plan_snapshot || []).filter((a: any) => !a.parent_id),
    });
  };

  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string; year: number; month: number; disabled: boolean }[] = [];
    const base = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const ref = firstOfMonth(d.getFullYear(), d.getMonth());
      opts.push({ value: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^\w/, (c) => c.toUpperCase()), year: d.getFullYear(), month: d.getMonth(), disabled: closedMonths.has(ref) });
    }
    return opts;
  }, [closedMonths]);

  // Histórico de evolução (da mais antiga para mais recente)
  const closingsAsc = [...closings].reverse();

  if (loading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <CalendarCheck2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm">Fechamentos Mensais</CardTitle>
              <CardDescription className="text-[11px]">
                Retrato congelado de cada mês — inclui estado das metas de acompanhamento
              </CardDescription>
            </div>
          </div>
          {isAdmin && (
            <Button onClick={() => setCloseOpen(true)} className="gap-2 bg-primary hover:bg-primary/90" size="sm">
              <Lock className="h-4 w-4" />
              Fechar mês
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-5">
        {/* ─── Evolução mensal (tabela comparativa) ─── */}
        {closingsAsc.length >= 2 && (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Evolução mensal
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/40">
                      <th className="text-left py-1.5 pr-3 font-medium text-muted-foreground">Mês</th>
                      <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">Patrimônio</th>
                      <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">Renda</th>
                      <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">Despesas</th>
                      <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">Poupança</th>
                      <th className="text-right py-1.5 pl-2 font-medium text-muted-foreground">% Metas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closingsAsc.map((c, i) => {
                      const prev = closingsAsc[i - 1];
                      const metasPct = metasPctByClosing[c.id];
                      return (
                        <tr key={c.id} className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="py-2 pr-3 font-medium whitespace-nowrap">
                            {monthLabel(c.month_ref)}
                            {c.status === "reaberto" && (
                              <Badge variant="outline" className="ml-1.5 text-[9px] py-0 h-3.5 text-amber-600 border-amber-500/30">reaberto</Badge>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums">
                            <div>{fmtBRL(c.net_worth)}</div>
                            {prev && <Delta curr={c.net_worth} prev={prev.net_worth} />}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums">
                            <div>{fmtBRL(c.total_income)}</div>
                            {prev && <Delta curr={c.total_income} prev={prev.total_income} />}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums">
                            <div>{fmtBRL(c.total_expenses)}</div>
                            {prev && <Delta curr={c.total_expenses} prev={prev.total_expenses} />}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums">
                            <div>{fmtPct(c.savings_rate)}</div>
                            {prev && <Delta curr={c.savings_rate} prev={prev.savings_rate} />}
                          </td>
                          <td className="py-2 pl-2 text-right tabular-nums">
                            {metasPct != null ? (
                              <div className="flex items-center justify-end gap-1">
                                <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div className={cn("h-full rounded-full", metasPct >= 80 ? "bg-emerald-500" : metasPct >= 50 ? "bg-blue-500" : "bg-amber-500")} style={{ width: `${Math.min(metasPct, 100)}%` }} />
                                </div>
                                <span className="font-medium">{metasPct}%</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* ─── Lista de fechamentos ─── */}
        {closings.length === 0 ? (
          <div className="flex items-center gap-3 py-3 px-3 rounded-lg bg-muted/30">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarCheck2 className="h-4 w-4 text-primary/60" />
            </div>
            <p className="text-xs text-muted-foreground leading-snug">
              <span className="font-semibold text-foreground">Nenhum mês fechado ainda.</span>{" "}
              {isAdmin ? "Use o botão 'Fechar mês' para congelar os números e o estado das metas naquele momento." : "Quando seu consultor fechar um mês, ele aparecerá aqui."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {closings.map((c) => {
              const isOpen = openId === c.id;
              const isReopened = c.status === "reaberto";
              const metasPct = metasPctByClosing[c.id];
              return (
                <div key={c.id} className="rounded-xl border border-border/60 overflow-hidden bg-card">
                  <button
                    onClick={() => setOpenId(isOpen ? null : c.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", isReopened ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary")}>
                      {isReopened ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{monthLabel(c.month_ref)}</span>
                        <Badge variant="outline" className={cn("text-[9px]", isReopened ? "border-amber-500/30 text-amber-600" : "border-emerald-500/30 text-emerald-600")}>
                          {isReopened ? "Reaberto" : "Fechado"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                        <span>Patrimônio: <span className="font-semibold text-foreground tabular-nums">{fmtBRL(c.net_worth)}</span></span>
                        <span>Poupança: <span className="font-semibold text-foreground tabular-nums">{fmtPct(c.savings_rate)}</span></span>
                        {metasPct != null && <span>Metas: <span className="font-semibold text-foreground tabular-nums">{metasPct}%</span></span>}
                      </div>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="p-4 border-t border-border/40 space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[["Renda", fmtBRL(c.total_income)], ["Despesas", fmtBRL(c.total_expenses)], ["Ativos", fmtBRL(c.total_assets)], ["Dívidas", fmtBRL(c.total_debts)], ["Patrimônio", fmtBRL(c.net_worth)], ["Poupança", fmtPct(c.savings_rate)], ["Reserva", `${(Number(c.emergency_reserve_months) || 0).toFixed(1)} m`], ["% Metas", metasPct != null ? `${metasPct}%` : "—"]].map(([label, value]) => (
                              <div key={label} className="rounded-lg bg-muted/40 p-2">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                                <p className="text-sm font-bold tabular-nums">{value}</p>
                              </div>
                            ))}
                          </div>
                          {/* Conquistas do mês — metas arquivadas dentro do periodo do fechamento */}
                          {(() => {
                            const monthStart = new Date(c.month_ref + "T00:00:00");
                            const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);
                            const conquistas = (metasConcluidas as any[]).filter((m) => {
                              if (!m.completed_at) return false;
                              const d = new Date(m.completed_at);
                              return d >= monthStart && d <= monthEnd;
                            });
                            const goalsConquistas = (() => {
                              return [];
                            })();
                            if (!conquistas.length) return null;
                            return (
                              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300/40 p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                    {conquistas.length} meta{conquistas.length !== 1 ? "s" : ""} atingida{conquistas.length !== 1 ? "s" : ""} neste mês
                                  </p>
                                </div>
                                <div className="space-y-1.5">
                                  {conquistas.map((m: any) => (
                                    <div key={m.id} className="flex items-start gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">{m.source_label}</p>
                                        {m.meta_text && (
                                          <p className="text-[10px] text-emerald-600/80 dark:text-emerald-500/70 line-clamp-1">{m.meta_text}</p>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-emerald-600/60 dark:text-emerald-500/50 shrink-0 ml-auto">
                                        {new Date(m.completed_at).toLocaleDateString("pt-BR")}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {c.notes && (
                            <div className="rounded-lg bg-muted/30 p-3 border-l-2 border-primary/40">
                              <p className="text-[11px] italic text-muted-foreground">💬 {c.notes}</p>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                            <p className="text-[10px] text-muted-foreground">
                              Fechado em {new Date(c.closed_at).toLocaleString("pt-BR")}
                              {c.reopened_at && ` · Reaberto em ${new Date(c.reopened_at).toLocaleString("pt-BR")}`}
                            </p>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="gap-2" onClick={() => handlePdf(c)}>
                                <FileDown className="h-4 w-4" />PDF
                              </Button>
                              {isAdmin && c.status === "fechado" && (
                                <Button size="sm" variant="outline" className="gap-2" onClick={() => setReopenTarget(c)}>
                                  <Unlock className="h-4 w-4" />Reabrir
                                </Button>
                              )}
                              {isAdmin && c.status === "reaberto" && (
                                <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => handleRefreshClose(c)}>
                                  <Lock className="h-4 w-4" />Fechar novamente
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Dialog fechar mês */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-primary" />Fechar mês</DialogTitle>
            <DialogDescription>
              Congela todos os números financeiros e o estado atual das metas de acompanhamento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Mês de referência</label>
              <Select value={`${targetYear}-${targetMonth}`} onValueChange={(v) => { const [y, m] = v.split("-").map(Number); setTargetYear(y); setTargetMonth(m); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {monthOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
                      {o.label}{o.disabled ? " — já fechado" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Observações (opcional)</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Conquistas do mês, decisões importantes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)} disabled={closing}>Cancelar</Button>
            <Button onClick={handleClose} disabled={closing} className="gap-2">
              {closing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Fechar mês
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar reabrir */}
      <AlertDialog open={!!reopenTarget} onOpenChange={(o) => !o && setReopenTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir fechamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O fechamento de <strong>{reopenTarget && monthLabel(reopenTarget.month_ref)}</strong> ficará marcado como reaberto. Os números registrados continuam preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReopen}>Reabrir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default MonthlyClosings;
