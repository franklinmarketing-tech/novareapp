import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

/**
 * Loads the current user's notifications + realtime updates.
 * Returns list, unread count, and helpers to mark read / clear.
 */
export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data ?? []) as NotificationRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    refresh();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const unread = items.filter((n) => !n.read_at).length;

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  };

  const markAllRead = async () => {
    if (!user) return;
    const now = new Date().toISOString();
    await supabase.from("notifications").update({ read_at: now }).eq("user_id", user.id).is("read_at", null);
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
  };

  const remove = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setItems((prev) => prev.filter((n) => n.id !== id));
  };

  return { items, unread, loading, markRead, markAllRead, remove, refresh };
}

/** Helper for any place in the app to push a notification to the current user. */
export async function pushNotification(input: {
  user_id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  payload?: Record<string, unknown>;
}) {
  await supabase.from("notifications").insert({
    user_id: input.user_id,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
    payload: input.payload ?? {},
  });
}
