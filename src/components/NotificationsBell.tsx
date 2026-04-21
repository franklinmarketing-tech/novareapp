import { Bell, Check, X as XIcon } from "lucide-react";
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
      <PopoverContent align="end" className="w-[340px] p-0">
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
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "group relative px-4 py-3 border-b border-border/40 last:border-b-0 cursor-pointer hover:bg-accent/30 transition-colors",
                      isUnread && "bg-accent/15",
                    )}
                    onClick={() => {
                      if (isUnread) markRead(n.id);
                      if (n.link) navigate(n.link);
                    }}
                  >
                    <div className="flex items-start gap-2">
                      {isUnread && (
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-label="Não lida" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.8125rem] font-medium text-foreground truncate">{n.title}</p>
                        {n.body && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                        )}
                        <p className="text-[0.6875rem] text-muted-foreground/70 mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { locale: ptBR, addSuffix: true })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(n.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
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
