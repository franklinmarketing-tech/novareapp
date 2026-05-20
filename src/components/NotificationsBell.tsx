import { Bell, Check, X as XIcon, CheckCircle2, AlertTriangle, Sparkles, Info, ClipboardCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

const typeConfig: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
  onboarding_complete: { Icon: CheckCircle2,   color: "text-success",        bg: "bg-success/10" },
  diagnostico_done:    { Icon: CheckCircle2,   color: "text-success",        bg: "bg-success/10" },
  goal_achieved:       { Icon: Sparkles,       color: "text-accent",         bg: "bg-accent/10" },
  milestone:           { Icon: Sparkles,       color: "text-accent",         bg: "bg-accent/10" },
  data_confirmed:      { Icon: ClipboardCheck, color: "text-primary",        bg: "bg-primary/10" },
  warning:             { Icon: AlertTriangle,  color: "text-amber-500",      bg: "bg-amber-500/10" },
  alert:               { Icon: AlertTriangle,  color: "text-destructive",    bg: "bg-destructive/10" },
};

const getTypeConfig = (type: string) =>
  typeConfig[type] ?? { Icon: Info, color: "text-muted-foreground", bg: "bg-muted/60" };

export function NotificationsBell({ className }: Props) {
  const { items, unread, markRead, markAllRead, remove } = useNotifications();
  const navigate = useNavigate();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative h-9 w-9", className)}
          aria-label="Notificações"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[0.625rem] font-semibold flex items-center justify-center leading-none">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <p className="text-sm font-semibold">Notificações</p>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={markAllRead}>
              <Check className="h-3.5 w-3.5" /> Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[420px]">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            <ul className="py-1">
              {items.map((n) => {
                const isUnread = !n.read_at;
                const cfg = getTypeConfig(n.type);
                const { Icon } = cfg;
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "group relative flex border-b border-border/40 last:border-b-0 transition-colors",
                      isUnread ? "bg-accent/[0.07] hover:bg-accent/[0.12]" : "hover:bg-muted/40",
                      n.link && "cursor-pointer",
                    )}
                    onClick={() => {
                      if (isUnread) markRead(n.id);
                      if (n.link) navigate(n.link);
                    }}
                  >
                    {/* left accent bar */}
                    <div className={cn("w-[3px] shrink-0 rounded-l", isUnread ? "bg-accent" : "bg-transparent")} />

                    <div className="flex items-start gap-3 px-3 py-3 flex-1 min-w-0">
                      {/* type icon */}
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", cfg.bg)}>
                        <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={cn("text-[0.8125rem] leading-snug", isUnread ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                        )}
                        <div className="flex items-center justify-between mt-1.5 gap-2">
                          <p className="text-[0.6875rem] text-muted-foreground/60">
                            {formatDistanceToNow(new Date(n.created_at), { locale: ptBR, addSuffix: true })}
                          </p>
                          {n.link && (
                            <span className="text-[10px] font-semibold text-accent flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              Ver <ArrowRight className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(n.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                        aria-label="Remover"
                      >
                        <XIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
