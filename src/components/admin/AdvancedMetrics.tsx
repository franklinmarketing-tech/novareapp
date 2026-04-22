import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card3D } from "@/components/ui/card-3d";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  GitBranch,
  Cake,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Ticket médio mensal por cliente em acompanhamento (R$). Ajuste conforme o seu modelo. */
const TICKET_MENSAL = 500;

const fmtBRL = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1).replace(".0", "")}k`;
  return `R$ ${v.toFixed(0)}`;
};

const MONTHS_PT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

interface Birthday {
  id: string;
  slug: string;
  name: string;
  day: number;
  month: number;
  age: number;
  isToday: boolean;
}

interface FunnelStage {
  label: string;
  count: number;
  color: string;
}

interface Props {
  selectedMonth: number; // 0-11
  selectedYear: number;
}

const AdvancedMetrics = ({ selectedMonth, selectedYear }: Props) => {
  const navigate = useNavigate();
  const [mrr, setMrr] = useState(0);
  const [acompanhamento, setAcompanhamento] = useState(0);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [conversionRate, setConversionRate] = useState(0);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);

      const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
      const endISO = endOfMonth.toISOString();

      // Pull clients up to end of selected month
      const { data: clients } = await supabase
        .from("clients")
        .select("id, status, slug, user_id, date_of_birth, created_at")
        .lte("created_at", endISO);

      if (!clients || clients.length === 0) {
        setMrr(0);
        setAcompanhamento(0);
        setFunnel([
          { label: "Onboarding", count: 0, color: "bg-accent" },
          { label: "Diagnóstico", count: 0, color: "bg-destructive" },
          { label: "Acompanhamento", count: 0, color: "bg-success" },
        ]);
        setConversionRate(0);
        setBirthdays([]);
        setLoading(false);
        return;
      }

      const onb = clients.filter((c) => c.status === "onboarding_pendente").length;
      const diag = clients.filter((c) => c.status === "em_diagnostico").length;
      const acomp = clients.filter((c) => c.status === "em_acompanhamento").length;

      setAcompanhamento(acomp);
      setMrr(acomp * TICKET_MENSAL);
      setFunnel([
        { label: "Onboarding", count: onb, color: "bg-accent" },
        { label: "Diagnóstico", count: diag, color: "bg-destructive" },
        { label: "Acompanhamento", count: acomp, color: "bg-success" },
      ]);
      const totalReached = onb + diag + acomp;
      setConversionRate(totalReached > 0 ? Math.round((acomp / totalReached) * 100) : 0);

      // Birthdays in selected month
      const userIds = clients.map((c) => c.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      const nameMap: Record<string, string> = {};
      profiles?.forEach((p) => {
        nameMap[p.user_id] = p.full_name || "Sem nome";
      });

      const today = new Date();
      const isCurrentMonth =
        selectedMonth === today.getMonth() && selectedYear === today.getFullYear();

      const list: Birthday[] = clients
        .filter((c) => c.date_of_birth)
        .map((c) => {
          const dob = new Date(c.date_of_birth as string);
          const day = dob.getUTCDate();
          const month = dob.getUTCMonth();
          const refYear = selectedYear;
          const age = refYear - dob.getUTCFullYear();
          return {
            id: c.id,
            slug: c.slug,
            name: nameMap[c.user_id] || "Sem nome",
            day,
            month,
            age,
            isToday: isCurrentMonth && day === today.getDate() && month === today.getMonth(),
          };
        })
        .filter((b) => b.month === selectedMonth)
        .sort((a, b) => a.day - b.day);

      setBirthdays(list);
      setLoading(false);
    };

    fetchMetrics();
  }, [selectedMonth, selectedYear]);

  const maxFunnel = Math.max(...funnel.map((f) => f.count), 1);

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="grid grid-cols-1 xl:grid-cols-3 gap-4"
    >
      {/* ── MRR ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <Card3D interactive glowColor="rgba(34,197,94,0.1)">
          <div className="p-4 sm:p-5 xl:p-6 flex flex-col justify-center h-full min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-6 w-6 text-success" />
              <span className="text-xs text-muted-foreground font-medium">
                Receita mensal recorrente
              </span>
            </div>
            <p className="text-2xl xl:text-3xl font-bold text-foreground tracking-tight tabular-nums break-words">
              {loading ? "—" : fmtBRL(mrr)}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <TrendingUp className="h-3 w-3 text-success" />
              <p className="text-xs text-muted-foreground">
                {acompanhamento} cliente{acompanhamento === 1 ? "" : "s"} × {fmtBRL(TICKET_MENSAL)}/mês
              </p>
            </div>
          </div>
        </Card3D>
      </motion.div>

      {/* ── Funil de conversão ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card3D interactive glowColor="rgba(96,165,250,0.1)">
          <div className="p-4 sm:p-5 xl:p-6 flex flex-col h-full min-w-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GitBranch className="h-6 w-6 text-primary" />
                <span className="text-xs text-muted-foreground font-medium">
                  Funil de conversão
                </span>
              </div>
              <Badge
                variant="secondary"
                className="text-[10px] font-semibold rounded-full px-2 tabular-nums"
              >
                {conversionRate}%
              </Badge>
            </div>
            <div className="space-y-1.5 flex-1 flex flex-col justify-center">
              {funnel.map((stage) => (
                <div key={stage.label}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] text-muted-foreground">{stage.label}</span>
                    <span className="text-[11px] font-bold text-foreground tabular-nums">
                      {stage.count}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(stage.count / maxFunnel) * 100}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className={`h-full ${stage.color} rounded-full`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card3D>
      </motion.div>

      {/* ── Aniversariantes ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <Card3D interactive glowColor="rgba(236,72,153,0.1)">
          <div className="p-4 sm:p-5 xl:p-6 flex flex-col h-full min-w-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cake className="h-6 w-6 text-accent" />
                <span className="text-xs text-muted-foreground font-medium">
                  Aniversariantes de {MONTHS_PT[selectedMonth]}
                </span>
              </div>
              {birthdays.length > 0 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] font-semibold rounded-full px-2 tabular-nums"
                >
                  {birthdays.length}
                </Badge>
              )}
            </div>
            {birthdays.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-2">
                <Cake className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">
                  Nenhum aniversariante este mês
                </p>
              </div>
            ) : (
              <div className="space-y-0.5 max-h-[140px] overflow-y-auto -mx-2">
                {birthdays.slice(0, 4).map((b) => (
                  <div
                    key={b.id}
                    onClick={() => navigate(`/admin/cliente/${b.slug}/onboarding`)}
                    className="flex items-center gap-2 py-1.5 px-2 cursor-pointer hover:bg-muted/40 rounded-lg transition-all duration-200 group"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-semibold text-accent">
                        {String(b.day).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">
                        {b.name}
                        {b.isToday && (
                          <span className="ml-1.5 text-[9px] font-bold text-accent uppercase">
                            hoje
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {b.age} anos
                      </p>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-all shrink-0" />
                  </div>
                ))}
                {birthdays.length > 4 && (
                  <p className="text-[10px] text-muted-foreground text-center pt-1">
                    +{birthdays.length - 4} mais
                  </p>
                )}
              </div>
            )}
          </div>
        </Card3D>
      </motion.div>
    </motion.div>
  );
};

export default AdvancedMetrics;
