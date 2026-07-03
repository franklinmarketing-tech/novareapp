// Painel admin do Vida Plan (super-admin/admin) — operações privilegiadas via service role.
// Ações: list (todos os usuários + plano/consultor/clientes), setSub, setConsultorPlano, deleteUser.
// Segurança: exige JWT do chamador E que ele seja admin/super_admin (checado em user_roles).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!token) return json({ error: "Sem autenticação" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Identifica o chamador e confere o papel.
    const { data: userData } = await admin.auth.getUser(token);
    const caller = userData?.user;
    if (!caller) return json({ error: "Sessão inválida" }, 401);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", caller.id);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) return json({ error: "Acesso negado" }, 403);

    const { action, payload } = await req.json().catch(() => ({ action: "", payload: {} }));

    if (action === "list") {
      const users: any[] = [];
      for (let page = 1; page <= 25; page++) {
        const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        const list = data?.users ?? [];
        users.push(...list);
        if (list.length < 200) break;
      }
      const [{ data: subs }, { data: cons }, { data: vinc }, { data: plans }] = await Promise.all([
        admin.from("vidaplan_subscriptions").select("user_id,status,plano"),
        admin.from("vidaplan_consultores").select("consultor_id,codigo,plano_status,trial_until,sistema,empresa"),
        admin.from("vidaplan_vinculos").select("consultor_id"),
        admin.from("vidaplan_plans").select("user_id"),
      ]);
      const subMap: Record<string, any> = {}; (subs ?? []).forEach((s: any) => subMap[s.user_id] = s);
      const consMap: Record<string, any> = {}; (cons ?? []).forEach((c: any) => consMap[c.consultor_id] = c);
      const nCli: Record<string, number> = {}; (vinc ?? []).forEach((v: any) => nCli[v.consultor_id] = (nCli[v.consultor_id] || 0) + 1);
      const temPlano = new Set((plans ?? []).map((p: any) => p.user_id));

      const rows = users.map((u) => ({
        id: u.id,
        email: u.email,
        nome: u.user_metadata?.full_name || u.user_metadata?.name || "",
        criado: u.created_at,
        ultimoLogin: u.last_sign_in_at,
        confirmado: !!u.email_confirmed_at,
        temPlano: temPlano.has(u.id),
        sub: subMap[u.id] ? { status: subMap[u.id].status, plano: subMap[u.id].plano } : null,
        consultor: consMap[u.id] ? { codigo: consMap[u.id].codigo, plano_status: consMap[u.id].plano_status, trial_until: consMap[u.id].trial_until, sistema: consMap[u.id].sistema, empresa: consMap[u.id].empresa } : null,
        nClientes: nCli[u.id] || 0,
      }));
      return json({ ok: true, users: rows });
    }

    if (action === "setSub") {
      const { userId, status } = payload || {};
      await admin.from("vidaplan_subscriptions").upsert({ user_id: userId, plano: status === "active" ? "gold" : "free", status, updated_at: new Date().toISOString() });
      return json({ ok: true });
    }

    if (action === "setConsultorPlano") {
      const { userId, plano_status } = payload || {};
      await admin.from("vidaplan_consultores").update({ plano_status, updated_at: new Date().toISOString() }).eq("consultor_id", userId);
      return json({ ok: true });
    }

    if (action === "deleteUser") {
      const { userId } = payload || {};
      if (userId === caller.id) return json({ error: "Você não pode excluir a si mesmo." }, 400);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    console.error("vidaplan-admin error:", e);
    return json({ error: "Erro interno" }, 500);
  }
});
