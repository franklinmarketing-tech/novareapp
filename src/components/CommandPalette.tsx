import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Wallet,
  Settings,
  User as UserIcon,
} from "lucide-react";

interface ClientSearchRow {
  id: string;
  slug: string;
  full_name: string;
  email: string;
}

/**
 * Global Cmd+K (Ctrl+K) palette — admin only.
 * Quick navigation + client jump.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<ClientSearchRow[]>([]);
  const navigate = useNavigate();
  const { role } = useAuth();

  // Toggle on Cmd/Ctrl+K
  useEffect(() => {
    if (role !== "admin") return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [role]);

  // Lazy-load clients when opened
  useEffect(() => {
    if (!open || clients.length > 0 || role !== "admin") return;
    (async () => {
      const { data: cs } = await supabase
        .from("clients")
        .select("id, slug, user_id")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!cs?.length) return;
      const userIds = cs.map((c) => c.user_id);
      const { data: ps } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);
      const map = new Map((ps ?? []).map((p) => [p.user_id, p]));
      setClients(
        cs.map((c) => ({
          id: c.id,
          slug: c.slug,
          full_name: map.get(c.user_id)?.full_name ?? "Sem nome",
          email: map.get(c.user_id)?.email ?? "",
        })),
      );
    })();
  }, [open, clients.length, role]);

  if (role !== "admin") return null;

  const go = (path: string) => {
    setOpen(false);
    setQuery("");
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Buscar clientes, páginas, ações…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        <CommandGroup heading="Navegação">
          <CommandItem onSelect={() => go("/admin")}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span className="truncate">Dashboard</span>
            <CommandShortcut>D</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/admin/clientes")}>
            <Users className="mr-2 h-4 w-4" />
            <span className="truncate">Lista de clientes</span>
          </CommandItem>
          <CommandItem onSelect={() => go("/admin/novo-cliente")}>
            <UserPlus className="mr-2 h-4 w-4" />
            <span className="truncate">Novo cliente</span>
            <CommandShortcut>N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/admin/financeiro")}>
            <Wallet className="mr-2 h-4 w-4" />
            <span className="truncate">Financeiro</span>
          </CommandItem>
          <CommandItem onSelect={() => go("/admin/configuracoes")}>
            <Settings className="mr-2 h-4 w-4" />
            <span className="truncate">Configurações</span>
          </CommandItem>
        </CommandGroup>

        {clients.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Clientes">
              {clients.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.full_name} ${c.email}`}
                  onSelect={() => go(`/admin/cliente/${c.slug}/onboarding`)}
                >
                  <UserIcon className="mr-2 h-4 w-4" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate text-sm">{c.full_name}</span>
                    <span className="truncate text-xs text-muted-foreground">{c.email}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
