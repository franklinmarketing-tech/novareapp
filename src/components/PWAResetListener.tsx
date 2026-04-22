import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PWA_RESET_CHANNEL, PWA_RESET_STORAGE_KEY, resetLocalPwaState } from "@/lib/pwaReset";

export const PWAResetListener = () => {
  useEffect(() => {
    let active = true;
    let channel: BroadcastChannel | null = null;
    let intervalId: number | undefined;

    const applyResetToken = (token: string | null) => {
      if (!token || localStorage.getItem(PWA_RESET_STORAGE_KEY) === token) return;
      resetLocalPwaState({ token });
    };

    const checkRemoteToken = async () => {
      const { data } = await supabase
        .from("app_global_config")
        .select("integrations")
        .eq("id", 1)
        .maybeSingle();

      if (!active) return;
      const integrations = data?.integrations as Record<string, unknown> | null;
      applyResetToken(typeof integrations?.pwa_reset_token === "string" ? integrations.pwa_reset_token : null);
    };

    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel(PWA_RESET_CHANNEL);
      channel.onmessage = (event) => {
        if (event.data?.type === "reset") applyResetToken(event.data.token);
      };
    }

    checkRemoteToken();
    intervalId = window.setInterval(checkRemoteToken, 72 * 60 * 60 * 1000);

    return () => {
      active = false;
      if (intervalId) window.clearInterval(intervalId);
      channel?.close();
    };
  }, []);

  return null;
};

export default PWAResetListener;