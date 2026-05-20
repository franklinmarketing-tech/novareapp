import { useClientId } from "@/contexts/ClientContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ParecerMetas } from "@/components/parecer/ParecerMetas";
import { JourneyFooterNav } from "@/components/admin/JourneyFooterNav";
import { Target, Sparkles, Save, ListChecks } from "lucide-react";

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
    <div className="space-y-5">
      {/* Hero header — guia consultivo */}
      <section
        className="relative overflow-hidden rounded-2xl"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--accent) / 0.06) 0%, hsl(var(--card)) 45%, hsl(var(--card)) 100%)",
          border: "1px solid hsl(var(--foreground) / 0.10)",
          boxShadow:
            "0 1px 0 hsl(0 0% 100% / 0.55) inset, 0 2px 6px -2px hsl(0 0% 0% / 0.05), 0 12px 28px -16px hsl(0 0% 0% / 0.10)",
        }}
      >
        {/* Decorative accent */}
        <div
          aria-hidden
          className="absolute -top-16 -right-16 h-48 w-48 rounded-full opacity-50 blur-3xl"
          style={{ background: "hsl(var(--accent) / 0.18)" }}
        />

        <div className="relative px-5 sm:px-6 py-5 sm:py-6 flex flex-col gap-5">
          {/* Top: title + cliente */}
          <div className="flex items-start gap-4">
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(145deg, hsl(var(--accent) / 0.22) 0%, hsl(var(--accent) / 0.08) 100%)",
                border: "1px solid hsl(var(--accent) / 0.35)",
                boxShadow: "0 1px 0 hsl(0 0% 100% / 0.5) inset, 0 2px 6px hsl(var(--accent) / 0.18)",
              }}
            >
              <Target className="h-5 w-5 text-accent" strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                  Etapa 3 · Plano de Ação
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight leading-tight">
                Defina as metas de {client?.full_name?.split(" ")[0] ?? "do cliente"}
              </h1>
              <p className="text-[13px] text-muted-foreground mt-1 leading-snug max-w-2xl">
                Transforme o diagnóstico em ação. Para cada item financeiro abaixo, defina uma meta clara —
                aumentar, reduzir, quitar ou manter — com prazo e valor.
              </p>
            </div>
          </div>

          {/* Steps trail */}
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <li
                  key={s.n}
                  className="flex items-start gap-3 rounded-xl px-3.5 py-2.5 transition-colors hover:bg-muted/30"
                  style={{
                    background: "hsl(var(--background) / 0.5)",
                    border: "1px solid hsl(var(--border) / 0.7)",
                  }}
                >
                  <div className="flex flex-col items-center shrink-0 pt-0.5">
                    <span
                      className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-accent"
                      style={{
                        background: "hsl(var(--accent) / 0.12)",
                        border: "1px solid hsl(var(--accent) / 0.3)",
                      }}
                    >
                      {s.n}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-foreground/70" strokeWidth={2.2} />
                      <p className="text-[12.5px] font-semibold text-foreground leading-tight">{s.label}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{s.desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <ParecerMetas clientId={clientId} />

      <JourneyFooterNav
        current="parecer"
        message="Metas definidas. Avance para o Plano de Ação para estruturar os próximos passos."
      />
    </div>
  );
};

export default AdminParecer;
