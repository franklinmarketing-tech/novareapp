import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CLIENT_TABLES = [
  "assets",
  "consultant_notes",
  "data_confirmations",
  "debts",
  "diagnosis",
  "expenses",
  "goals",
  "implementation_sessions",
  "income",
  "insurance",
  "investment_recommendations",
  "monitoring_snapshots",
] as const;

export async function deleteUserAccount(admin: SupabaseClient, userId: string) {
  const { data: clientRow, error: clientError } = await admin
    .from("clients")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (clientError) throw new Error(clientError.message);

  const clientId = clientRow?.id ?? null;

  if (clientId) {
    const { data: actionPlans, error: actionPlansError } = await admin
      .from("action_plans")
      .select("id")
      .eq("client_id", clientId);

    if (actionPlansError) throw new Error(actionPlansError.message);

    const actionPlanIds = (actionPlans ?? []).map((plan) => plan.id);

    if (actionPlanIds.length > 0) {
      const { error: actionItemsError } = await admin
        .from("action_items")
        .delete()
        .in("action_plan_id", actionPlanIds);

      if (actionItemsError) throw new Error(actionItemsError.message);
    }

    for (const table of CLIENT_TABLES) {
      const { error } = await admin.from(table).delete().eq("client_id", clientId);
      if (error) throw new Error(error.message);
    }

    const { error: actionPlansDeleteError } = await admin
      .from("action_plans")
      .delete()
      .eq("client_id", clientId);

    if (actionPlansDeleteError) throw new Error(actionPlansDeleteError.message);

    const { error: clientDeleteError } = await admin.from("clients").delete().eq("id", clientId);
    if (clientDeleteError) throw new Error(clientDeleteError.message);
  }

  const cleanupOps = await Promise.all([
    admin.from("banned_users").delete().eq("user_id", userId),
    admin.from("user_roles").delete().eq("user_id", userId),
    admin.from("profiles").delete().eq("user_id", userId),
  ]);

  for (const op of cleanupOps) {
    if (op.error) throw new Error(op.error.message);
  }

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);
  if (authDeleteError && !/not found/i.test(authDeleteError.message)) {
    throw new Error(authDeleteError.message);
  }

  return { clientId, deletedAuthUser: !authDeleteError };
}
