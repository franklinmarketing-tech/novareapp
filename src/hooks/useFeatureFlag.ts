import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FeatureFlag {
  key: string;
  enabled: boolean;
  rollout_pct: number;
  target_roles: string[] | null;
}

const cache = new Map<string, FeatureFlag>();
let allLoaded = false;
const subscribers = new Set<() => void>();

async function loadAll() {
  if (allLoaded) return;
  const { data } = await supabase.from("feature_flags").select("key, enabled, rollout_pct, target_roles");
  (data ?? []).forEach((f: any) => cache.set(f.key, f));
  allLoaded = true;
  subscribers.forEach((s) => s());
}

export function useFeatureFlag(key: string): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => cache.get(key)?.enabled ?? false);

  useEffect(() => {
    let mounted = true;
    const update = () => {
      if (!mounted) return;
      const f = cache.get(key);
      setEnabled(!!f?.enabled);
    };
    subscribers.add(update);
    loadAll().then(update);
    return () => {
      mounted = false;
      subscribers.delete(update);
    };
  }, [key]);

  return enabled;
}

export function refreshFeatureFlags() {
  allLoaded = false;
  cache.clear();
  return loadAll();
}
