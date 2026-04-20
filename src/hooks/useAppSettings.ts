import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AppSettings {
  company_name: string;
  logo_url: string | null;
  brand_color: string;
  support_email: string | null;
  website_url: string | null;
}

const DEFAULTS: AppSettings = {
  company_name: "Novare",
  logo_url: null,
  brand_color: "#0F172A",
  support_email: null,
  website_url: null,
};

export const useAppSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("company_name, logo_url, brand_color, support_email, website_url")
      .eq("id", 1)
      .maybeSingle();
    if (data) setSettings({ ...DEFAULTS, ...data });
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { settings, loading, reload };
};
