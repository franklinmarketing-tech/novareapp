import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Broadcast {
  id: string;
  message: string;
  severity: "info" | "warning" | "critical" | "success";
  link_url: string | null;
  link_label: string | null;
}

const ICONS = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
  success: CheckCircle2,
} as const;

const STYLES = {
  info: "bg-sky-500/10 text-sky-900 dark:text-sky-200 border-sky-500/30",
  warning: "bg-amber-500/10 text-amber-900 dark:text-amber-200 border-amber-500/30",
  critical: "bg-destructive/15 text-destructive border-destructive/40",
  success: "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border-emerald-500/30",
} as const;

const DISMISS_KEY = "novare_dismissed_broadcasts";

export const GlobalBanners = () => {
  const { role } = useAuth();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "[]"); } catch { return []; }
  });
  const [maintenance, setMaintenance] = useState<{ on: boolean; msg: string | null }>({ on: false, msg: null });
  const [readonly, setReadonly] = useState<{ on: boolean; msg: string | null }>({ on: false, msg: null });

  useEffect(() => {
    if (!role) return;
    const load = async () => {
      const [{ data: bcasts }, { data: cfg }] = await Promise.all([
        supabase.rpc("get_active_broadcasts", { _role: role }),
        supabase.from("app_global_config").select("maintenance_mode, maintenance_message, readonly_mode, readonly_message").eq("id", 1).maybeSingle(),
      ]);
      setBroadcasts((bcasts ?? []) as Broadcast[]);
      setMaintenance({ on: !!cfg?.maintenance_mode, msg: cfg?.maintenance_message ?? null });
      setReadonly({ on: !!cfg?.readonly_mode, msg: cfg?.readonly_message ?? null });
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [role]);

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
  };

  const visible = broadcasts.filter((b) => !dismissed.includes(b.id));

  if (!visible.length && !maintenance.on && !readonly.on) return null;

  return (
    <div className="sticky top-0 z-50 space-y-px">
      {maintenance.on && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 border-b border-amber-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="truncate">{maintenance.msg || "Modo manutenção ativo"}</span>
        </div>
      )}
      {readonly.on && (
        <div className="bg-orange-500 text-orange-950 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 border-b border-orange-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="truncate">{readonly.msg || "Modo somente-leitura ativo — edições temporariamente bloqueadas"}</span>
        </div>
      )}
      {visible.map((b) => {
        const Icon = ICONS[b.severity];
        return (
          <div key={b.id} className={cn("border-b px-4 py-2 text-sm flex items-center gap-3", STYLES[b.severity])}>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{b.message}</span>
            {b.link_url && (
              <a href={b.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline font-medium shrink-0">
                {b.link_label ?? "Saiba mais"} <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <button onClick={() => dismiss(b.id)} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Dispensar">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
