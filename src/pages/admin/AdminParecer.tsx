import { Suspense } from "react";
import { useClientId } from "@/contexts/ClientContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ParecerMetas } from "@/components/parecer/ParecerMetas";
import { JourneyFooterNav } from "@/components/admin/JourneyFooterNav";
import { Target, Sparkles, Save, ListChecks } from "lucide-react";
import { SkeletonCard } from "@/components/ui/skeleton-card";

const AdminParecer = () => {
  const { clientId } = useClientId();

  const { data: client } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data: c } = await supabase
        .from("clients")
        .select("user_id")
        .eq("id", clientId)
        .maybeSingle();
      if (!c?.user_id) return null;
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", c.user_id)
        .maybeSingle();
      return p;
    },
    enabled: !!clientId,
  });

  if (!clientId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Selecione um cliente para definir as metas.
      </div>
    );
  }

  const steps = [
    { n: 1, icon: ListChecks, label: "Revise os itens", desc: "Renda, despesas, dívidas, patrimônio" },
    { n: 2, icon: Sparkles, label: "Use a IA (opcional)", desc: "Sugestões inteligentes em segundos" },
    { n: 3, icon: Save, label: "Defina e salve", desc: "Uma meta por item financeiro" },
  ];

  return (
    <div className="space-y-4">
      {/* Hero header compacto */}
      <section
        className="relative overflow-hidden rounded-xl"
        style={{
          background: "linear-gradient(135deg, hsl(var(--accent) / 0.05) 0%, hsl(var(--card)) 50%)",
          border: "1px solid hsl(var(--foreground) / 0.08)",
          boxShadow: "0 1px 0 hsl(0 0% 100% / 0.5) inset, 0 2px 8px -4px hsl(0 0% 0% / 0.06)",
        }}
      >
        <div className="relative px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">

          {/* Left: icon + title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "hsl(var(--accent) / 0.12)",
                border: "1px solid hsl(var(--accent) / 0.28)",
              }}
            >
              <Target className="h-4 w-4 text-accent" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-accent block leading-none mb-0.5">
                Etapa 3 · Plano de Ação
              </span>
              <h1 className="text-sm sm:text-base font-bold text-foreground tracking-tight leading-tight truncate">
                Defina as metas de {client?.full_name?.split(" ")[0] ?? "do cliente"}
              </h1>
            </div>
          </div>

          {/* Right: steps inline */}
          <ol className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={s.n} className="flex items-center gap-1">
                  {i > 0 && <span className="w-3 h-px bg-border/60" />}
                  <div
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                    style={{
                      background: "hsl(var(--background) / 0.6)",
                      border: "1px solid hsl(var(--border) / 0.6)",
                    }}
                  >
                    <span
                      className="h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold text-accent shrink-0"
                      style={{ background: "hsl(var(--accent) / 0.12)" }}
                    >
                      {s.n}
                    </span>
                    <Icon className="h-3 w-3 text-foreground/60" strokeWidth={2.2} />
                    <span className="text-[11px] font-medium text-foreground/80 whitespace-nowrap">{s.label}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <Suspense fallback={
        <div className="space-y-3">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </div>
      }>
        <ParecerMetas clientId={clientId} />
      </Suspense>

      <JourneyFooterNav
        current="parecer"
        message="Metas definidas. Avance para o Plano de Ação para estruturar os próximos passos."
      />
    </div>
  );
};

export default AdminParecer;
