import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function authenticateSuperAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { error: json({ error: "Sem autorização" }, 401) };

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return { error: json({ error: "Não autenticado" }, 401) };

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: isSuper } = await admin.rpc("is_super_admin", { _user_id: userData.user.id });
  if (!isSuper) return { error: json({ error: "Acesso negado" }, 403) };

  return { user: userData.user, admin, userClient };
}

export async function requirePassword(
  email: string,
  password: string
): Promise<boolean> {
  const tmp = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
  const { data, error } = await tmp.auth.signInWithPassword({ email, password });
  if (error || !data?.user) return false;
  await tmp.auth.signOut();
  return true;
}

export async function logAction(
  admin: ReturnType<typeof createClient>,
  params: {
    actor_user_id: string;
    actor_email?: string | null;
    action: string;
    target_type?: string;
    target_id?: string;
    target_email?: string;
    reason?: string;
    ip_address?: string | null;
    user_agent?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  await admin.from("super_admin_actions").insert(params);
}

export function getClientIp(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}
