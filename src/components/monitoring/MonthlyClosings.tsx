import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
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
import { Lock, Unlock, FileDown, Loader2, CalendarCheck2, ChevronDown, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { generateMonthlyClosingPdf } from "@/lib/generateMonthlyClosingPdf";

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
  clientName: string;
  /** true = consultor (pode fechar/reabrir); false = cliente (só visualiza). */
  isAdmin: boolean;
}

const fmtBRL = (v: number | null | undefined) =>
  v == null ? "—" : `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
const fmtPct = (v: number | null | undefined) => (v == null ? "—" : `${Number(v).toFixed(1)}%`);

const monthLabel = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^\w/, (c) => c.toUpperCase());
};

const firstOfMonth = (year: number, month: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-01`;

const MonthlyClosings = ({ clientId, clientName, isAdmin }: Props) => {
  const [closings, setClosings] = useState<MonthlyClosing[]>([]);
  const [loading, setLoading] = useState(true);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [notes, setNotes] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reopenTarget, setReopenTarget] = useState<MonthlyClosing | null>(null);

  // mês alvo do fechamento
  const now = new Date();
  const [targetYear, setTargetYear] = useState(now.getFullYear());
  const [targetMonth, setTargetMonth] = useState(now.getMonth());

  const load = async () => {
    if (!clientId) return;
    const { data, error } = await supabase
      .from("monthly_closings")
      .select("*")
      .eq("client_id", clientId)
      .order("month_ref", { ascending: false });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
    setClosings((data as MonthlyClosing[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [clientId]);

  const closedMonths = useMemo(
    () => new Set(closings.filter((c) => c.status === "fechado").map((c) => c.month_ref)),
    [closings]
  );

  const handleClose = async () => {
    setClosing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão inválida.");

      // Buscar todos os dados atuais
      const [incRes, expRes, debRes, assRes, insRes, goalsRes, planRes] = await Promise.all([
        supabase.from("income").select("*").eq("client_id", clientId),
        supabase.from("expenses").select("*").eq("client_id", clientId),
        supabase.from("debts").select("*").eq("client_id", clientId),
        supabase.from("assets").select("*").eq("client_id", clientId),
        supabase.from("insurance").select("*").eq("client_id", clientId),
        supabase.from("goals").select("*").eq("client_id", clientId),
        supabase.from("action_plans").select("id").eq("client_id", clientId).maybeSingle(),
      ]);

      const income = incRes.data || [];
      const expenses = expRes.data || [];
      const debts = debRes.data || [];
      const assets = assRes.data || [];
      const insurance = insRes.data || [];
      const goals = goalsRes.data || [];

      const totalIncome = income.reduce((s, r: any) => {
        const a = Number(r.amount) || 0;
        return s + (r.frequency === "anual" ? a / 12 : a);
      }, 0);
      const totalExpenses = expenses.reduce((s, r: any) => s + (Number(r.amount) || 0), 0);
      const totalAssets = assets.reduce((s, r: any) => s + (Number(r.estimated_value) || 0), 0);
      const totalDebts = debts.reduce((s, r: any) => s + (Number(r.total_amount) || 0), 0);
      const monthlyDebtPayments = debts.reduce((s, r: any) => s + (Number(r.monthly_payment) || 0), 0);
      const netCashFlow = totalIncome - totalExpenses - monthlyDebtPayments;
      const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;
      const emergencyMonths = totalExpenses > 0 ? totalAssets / totalExpenses : 0;
      const netWorth = totalAssets - totalDebts;

      let actionItems: any[] = [];
      let planPct = 0;
      if (planRes.data) {
        const { data: items } = await supabase.from("action_items").select("*").eq("action_plan_id", planRes.data.id);
        actionItems = items || [];
        if (actionItems.length > 0) {
          planPct = Math.round((actionItems.filter((i) => i.status === "concluido").length / actionItems.length) * 100);
        }
      }

      // Progresso por objetivo
      const parentItems = actionItems.filter((a) => !a.parent_id);
      const goalsSnapshot = goals.map((g: any) => {
        const t = parentItems.filter((a) => a.goal_id === g.id);
        const done = t.filter((a) => a.status === "concluido").length;
        return {
          id: g.id,
          description: g.description,
          priority: g.priority,
          target_amount: g.target_amount,
          deadline: g.deadline,
          tasksDone: done,
          tasksTotal: t.length,
          pct: t.length > 0 ? Math.round((done / t.length) * 100) : 0,
        };
      });

      const monthRef = firstOfMonth(targetYear, targetMonth);

      const { error } = await supabase.from("monthly_closings").insert({
        client_id: clientId,
        month_ref: monthRef,
        status: "fechado",
        total_income: totalIncome,
        total_expenses: totalExpenses,
        total_assets: totalAssets,
        total_debts: totalDebts,
        monthly_debt_payments: monthlyDebtPayments,
        net_worth: netWorth,
        savings_rate: savingsRate,
        emergency_reserve_months: emergencyMonths,
        plan_completion_pct: planPct,
        income_snapshot: income,
        expenses_snapshot: expenses,
        debts_snapshot: debts,
        assets_snapshot: assets,
        insurance_snapshot: insurance,
        goals_snapshot: goalsSnapshot,
        action_plan_snapshot: actionItems,
        notes: notes.trim() || null,
        closed_by: user.id,
      });

      if (error) {
        if (error.code === "23505") {
          throw new Error("Este mês já tem um fechamento. Reabra-o se precisar refazer.");
        }
        throw error;
      }

      toast({ title: "Mês fechado!", description: "Snapshot completo registrado." });
      setCloseOpen(false);
      setNotes("");
      await load();
    } catch (e: any) {
      toast({ title: "Erro ao fechar", description: e.message || "Falha desconhecida", variant: "destructive" });
    } finally {
      setClosing(false);
    }
  };

  const handleReopen = async () => {
    if (!reopenTarget) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("monthly_closings")
      .update({ status: "reaberto", reopened_at: new Date().toISOString(), reopened_by: user?.id })
      .eq("id", reopenTarget.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Mês reaberto", description: "O fechamento ficou marcado como reaberto." });
    setReopenTarget(null);
    await load();
  };

  const handlePdf = async (c: MonthlyClosing) => {
    await generateMonthlyClosingPdf({
      clientName,
      monthLabel: monthLabel(c.month_ref),
      closedAt: new Date(c.closed_at).toLocaleString("pt-BR"),
      notes: c.notes,
      totals: {
        total_income: Number(c.total_income) || 0,
        total_expenses: Number(c.total_expenses) || 0,
        total_assets: Number(c.total_assets) || 0,
        total_debts: Number(c.total_debts) || 0,
        monthly_debt_payments: Number(c.monthly_debt_payments) || 0,
        net_worth: Number(c.net_worth) || 0,
        savings_rate: Number(c.savings_rate) || 0,
        emergency_reserve_months: Number(c.emergency_reserve_months) || 0,
        plan_completion_pct: Number(c.plan_completion_pct) || 0,
      },
      income: c.income_snapshot || [],
      expenses: c.expenses_snapshot || [],
      debts: c.debts_snapshot || [],
      assets: c.assets_snapshot || [],
      insurance: c.insurance_snapshot || [],
      goals: c.goals_snapshot || [],
      actionItems: (c.action_plan_snapshot || []).filter((a: any) => !a.parent_id),
    });
  };

  // Opções de mês para fechar (últimos 12 meses, exceto já fechados)
  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string; year: number; month: number; disabled: boolean }[] = [];
    const base = new Date();
    base.setDate(1);
    for (let i = 0; i < 12; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const ref = firstOfMonth(d.getFullYear(), d.getMonth());
      opts.push({
        value: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^\w/, (c) => c.toUpperCase()),
        year: d.getFullYear(),
        month: d.getMonth(),
        disabled: closedMonths.has(ref),
      });
    }
    return opts;
  }, [closedMonths]);

  if (loading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <CalendarCheck2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm">Fechamentos Mensais</CardTitle>
              <CardDescription className="text-[11px]">
                Retrato congelado da situação financeira de cada mês
              </CardDescription>
            </div>
          </div>
          {isAdmin && (
            <Button onClick={() => setCloseOpen(true)} className="gap-2 bg-primary hover:bg-primary/90">
              <Lock className="h-4 w-4" />
              Fechar mês
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {closings.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <CalendarCheck2 className="h-7 w-7 text-primary/50" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">Nenhum mês fechado ainda</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {isAdmin
                ? "Ao fechar um mês, todos os números são congelados e ficam disponíveis em PDF para o cliente."
                : "Quando seu consultor fechar um mês, ele aparecerá aqui com gráficos e relatório completo."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {closings.map((c) => {
              const isOpen = openId === c.id;
              const isReopened = c.status === "reaberto";
              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-border/60 overflow-hidden bg-card"
                >
                  <button
                    onClick={() => setOpenId(isOpen ? null : c.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isReopened ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"
                    }`}>
                      {isReopened ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">
                          {monthLabel(c.month_ref)}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${isReopened
                            ? "border-amber-500/30 text-amber-600 bg-amber-500/5"
                            : "border-emerald-500/30 text-emerald-600 bg-emerald-500/5"}`}
                        >
                          {isReopened ? "Reaberto" : "Fechado"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                        <span>Patrimônio: <span className="font-semibold text-foreground tabular-nums">{fmtBRL(c.net_worth)}</span></span>
                        <span>Poupança: <span className="font-semibold text-foreground tabular-nums">{fmtPct(c.savings_rate)}</span></span>
                        <span>Plano: <span className="font-semibold text-foreground tabular-nums">{fmtPct(c.plan_completion_pct)}</span></span>
                      </div>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 border-t border-border/40 space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              ["Renda", fmtBRL(c.total_income)],
                              ["Despesas", fmtBRL(c.total_expenses)],
                              ["Ativos", fmtBRL(c.total_assets)],
                              ["Dívidas", fmtBRL(c.total_debts)],
                              ["Patrimônio", fmtBRL(c.net_worth)],
                              ["Poupança", fmtPct(c.savings_rate)],
                              ["Reserva", `${(Number(c.emergency_reserve_months) || 0).toFixed(1)} m`],
                              ["Plano", fmtPct(c.plan_completion_pct)],
                            ].map(([label, value]) => (
                              <div key={label} className="rounded-lg bg-muted/40 p-2">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                                <p className="text-sm font-bold text-foreground tabular-nums">{value}</p>
                              </div>
                            ))}
                          </div>

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
                                <FileDown className="h-4 w-4" />
                                Relatório PDF
                              </Button>
                              {isAdmin && c.status === "fechado" && (
                                <Button size="sm" variant="outline" className="gap-2" onClick={() => setReopenTarget(c)}>
                                  <Unlock className="h-4 w-4" />
                                  Reabrir
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

      {/* Dialog: fechar mês */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Fechar mês
            </DialogTitle>
            <DialogDescription>
              O fechamento congela todos os números atuais (receitas, despesas, dívidas, ativos,
              objetivos e plano de ação) como um retrato daquele mês. Depois de fechado, o cliente
              também consegue ver no painel dele.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Mês de referência</label>
              <Select
                value={`${targetYear}-${targetMonth}`}
                onValueChange={(v) => {
                  const [y, m] = v.split("-").map(Number);
                  setTargetYear(y); setTargetMonth(m);
                }}
              >
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
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Observações (opcional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Comentários sobre o mês, conquistas, decisões importantes..."
              />
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

      {/* Confirmação reabrir */}
      <AlertDialog open={!!reopenTarget} onOpenChange={(o) => !o && setReopenTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir fechamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O fechamento de <strong>{reopenTarget && monthLabel(reopenTarget.month_ref)}</strong> ficará
              marcado como <strong>reaberto</strong>. Os números registrados continuam preservados, mas o
              status muda para indicar que houve revisão. Apenas consultores podem fazer isso.
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
};

export default MonthlyClosings;
