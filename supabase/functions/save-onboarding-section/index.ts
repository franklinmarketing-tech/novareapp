import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const toNumber = (value: unknown, fallback = 0) => {
  const number = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(number) ? number : fallback;
};

const toInt = (value: unknown, fallback = 0) => {
  const number = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  return Number.isFinite(number) ? number : fallback;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) return json({ error: "Token inválido" }, 401);

    const callerId = claimsData.claims.sub;
    const [{ data: isAdmin }, { data: isSuperAdmin }] = await Promise.all([
      callerClient.rpc("has_role", { _user_id: callerId, _role: "admin" }),
      callerClient.rpc("is_super_admin", { _user_id: callerId }),
    ]);
    if (!isAdmin && !isSuperAdmin) return json({ error: "Acesso negado" }, 403);

    const body = await req.json().catch(() => null);
    if (!isRecord(body)) return json({ error: "Payload inválido" }, 400);

    const clientId = typeof body.clientId === "string" ? body.clientId : "";
    const section = typeof body.section === "number" ? body.section : -1;
    const payload = body.payload;
    // monthRef opcional: quando informado (YYYY-MM-01), o save afeta APENAS
    // os registros daquele mês (delete + insert filtrado por month_ref).
    // Quando ausente/null, o comportamento legado é mantido (todos os registros).
    const monthRef = typeof body.monthRef === "string" && /^\d{4}-\d{2}-01$/.test(body.monthRef)
      ? body.monthRef
      : null;
    if (!clientId || section < 0 || section > 7) return json({ error: "Dados inválidos" }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: client, error: clientError } = await admin.from("clients").select("id, user_id").eq("id", clientId).single();
    if (clientError || !client) return json({ error: "Cliente não encontrado" }, 404);

    // Helper: aplica filtro de month_ref no DELETE quando informado
    const scopedDelete = (table: string) => {
      const q = admin.from(table).delete().eq("client_id", clientId);
      return monthRef ? q.eq("month_ref", monthRef) : q;
    };
    // Helper: injeta month_ref no insert quando informado
    const withMonthRef = <T extends Record<string, unknown>>(row: T) =>
      monthRef ? { ...row, month_ref: monthRef } : row;

    let committed: unknown = null;

    if (section === 0) {
      if (!isRecord(payload)) return json({ error: "Identificação inválida" }, 400);
      const { error: updateClientError } = await admin
        .from("clients")
        .update({
          cpf: payload.cpf || null,
          date_of_birth: payload.date_of_birth || null,
          marital_status: payload.marital_status || null,
          property_regime: payload.property_regime || null,
          profession: payload.profession || null,
          company: payload.company || null,
          years_in_profession: payload.years_in_profession ? toInt(payload.years_in_profession, 0) : null,
          dependents_count: payload.dependents_count ? toInt(payload.dependents_count, 0) : 0,
          dependents_ages: payload.dependents_ages || null,
          city: payload.city || null,
          state: payload.state || null,
        })
        .eq("id", clientId);
      if (updateClientError) throw updateClientError;

      const { error: profileError } = await admin
        .from("profiles")
        .update({ full_name: String(payload.full_name ?? "") })
        .eq("user_id", client.user_id);
      if (profileError) throw profileError;

      committed = payload;
    }

    if (section === 1) {
      const items = Array.isArray(payload) ? payload : [];
      const { error: deleteError } = await scopedDelete("income");
      if (deleteError) throw deleteError;
      const valid = items.filter((r) => isRecord(r) && r.description && r.amount);
      if (valid.length === 0) committed = [];
      else {
        const { data, error } = await admin.from("income").insert(valid.map((r) => withMonthRef({ client_id: clientId, description: String(r.description), amount: toNumber(r.amount), frequency: r.frequency || "mensal", is_primary: Boolean(r.is_primary), stability: r.stability || "media" }))).select("*");
        if (error) throw error;
        committed = data ?? [];
      }
    }

    if (section === 2) {
      const items = Array.isArray(payload) ? payload : [];
      const { error: deleteError } = await scopedDelete("expenses");
      if (deleteError) throw deleteError;
      const valid = items.filter((e) => isRecord(e) && toNumber(e.amount) > 0);
      if (valid.length === 0) committed = [];
      else {
        const { data, error } = await admin.from("expenses").insert(valid.map((e) => {
          const isFixed = e.is_fixed === undefined ? true : Boolean(e.is_fixed);
          const dueDayRaw = toInt(e.due_day, 0);
          const dueDay = isFixed && dueDayRaw >= 1 && dueDayRaw <= 31 ? dueDayRaw : null;
          return withMonthRef({
            client_id: clientId,
            category: String(e.category || "outros"),
            amount: toNumber(e.amount),
            description: e.description ? String(e.description) : null,
            is_fixed: isFixed,
            due_day: dueDay,
          });
        })).select("*");
        if (error) throw error;
        committed = data ?? [];
      }
    }

    if (section === 3) {
      const items = Array.isArray(payload) ? payload : [];
      const { error: deleteError } = await scopedDelete("debts");
      if (deleteError) throw deleteError;
      const valid = items.filter((d) => isRecord(d) && d.type && d.total_amount);
      if (valid.length === 0) committed = [];
      else {
        const { data, error } = await admin.from("debts").insert(valid.map((d) => withMonthRef({ client_id: clientId, type: String(d.type), creditor: d.creditor ? String(d.creditor) : null, total_amount: toNumber(d.total_amount), monthly_payment: toNumber(d.monthly_payment), interest_rate: toNumber(d.interest_rate), remaining_months: toInt(d.remaining_months) }))).select("*");
        if (error) throw error;
        committed = data ?? [];
      }
    }

    if (section === 4) {
      const items = Array.isArray(payload) ? payload : [];
      const { error: deleteError } = await scopedDelete("assets");
      if (deleteError) throw deleteError;
      const valid = items.filter((a) => isRecord(a) && a.type && a.estimated_value);
      if (valid.length === 0) committed = [];
      else {
        const { data, error } = await admin.from("assets").insert(valid.map((a) => withMonthRef({ client_id: clientId, type: String(a.type), description: a.description ? String(a.description) : null, estimated_value: toNumber(a.estimated_value) }))).select("*");
        if (error) throw error;
        committed = data ?? [];
      }
    }

    if (section === 5) {
      const items = Array.isArray(payload) ? payload : [];
      const { error: deleteError } = await scopedDelete("insurance");
      if (deleteError) throw deleteError;
      const valid = items.filter((s) => isRecord(s) && s.type);
      if (valid.length === 0) committed = [];
      else {
        const { data, error } = await admin.from("insurance").insert(valid.map((s) => withMonthRef({ client_id: clientId, type: String(s.type), provider: s.provider ? String(s.provider) : null, monthly_premium: toNumber(s.monthly_premium), coverage_amount: toNumber(s.coverage_amount) }))).select("*");
        if (error) throw error;
        committed = data ?? [];
      }
    }

    if (section === 6) {
      const items = Array.isArray(payload) ? payload : [];
      const { error: deleteError } = await scopedDelete("goals");
      if (deleteError) throw deleteError;
      const valid = items.filter((g) => isRecord(g) && g.description);
      if (valid.length === 0) committed = [];
      else {
        const { data, error } = await admin.from("goals").insert(valid.map((g) => withMonthRef({ client_id: clientId, description: String(g.description), target_amount: g.target_amount ? toNumber(g.target_amount) : null, deadline: g.deadline || null, priority: g.priority || "media" }))).select("*");
        if (error) throw error;
        committed = data ?? [];
      }
    }

    if (section === 7) {
      const { error } = await admin.from("clients").update({ behavioral_profile: payload }).eq("id", clientId);
      if (error) throw error;
      committed = payload;
    }

    return json({ section, committed });
  } catch (error) {
    console.error("save-onboarding-section error:", error);
    return json({ error: "Erro ao salvar seção do onboarding" }, 500);
  }
});