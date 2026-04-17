import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// =============================================================
// SEED ÚNICO E RÁPIDO — roda Maria + Lucas EM PARALELO
// Idempotente, silencioso, otimizado pra rodar em background
// =============================================================

async function ensureUserAndClient(
  admin: any,
  email: string,
  password: string,
  fullName: string
): Promise<{ userId: string; clientId: string }> {
  // 1) Tenta criar usuário (idempotente)
  const { data: userData, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  let userId: string;
  if (userErr) {
    if (!userErr.message?.includes("already") && !userErr.message?.includes("registered")) {
      throw userErr;
    }
    // Já existe: busca via listUsers
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list?.users?.find((u: any) => u.email === email);
    if (!existing) throw new Error(`User ${email} exists but not found`);
    userId = existing.id;
  } else {
    userId = userData.user!.id;
  }

  // 2) Aguarda trigger criar registro client (poll rápido em vez de sleep fixo)
  let clientId: string | null = null;
  for (let i = 0; i < 10; i++) {
    const { data: row } = await admin.from("clients").select("id").eq("user_id", userId).maybeSingle();
    if (row?.id) {
      clientId = row.id;
      break;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  if (!clientId) throw new Error(`Client record not created for ${email}`);

  return { userId, clientId };
}

async function seedMaria(admin: any) {
  const email = "maria.endividada@novare.com";
  const fullName = "Maria Aparecida Souza";
  const { userId, clientId } = await ensureUserAndClient(admin, email, "Maria@2026", fullName);

  await admin.from("profiles").update({ full_name: fullName, email }).eq("user_id", userId);

  await admin.from("clients").update({
    cpf: "123.456.789-10",
    date_of_birth: "1985-07-12",
    marital_status: "divorciada",
    profession: "Auxiliar administrativa",
    company: "Comércio Local Ltda",
    years_in_profession: 12,
    city: "São Paulo",
    state: "SP",
    dependents_count: 2,
    dependents_ages: "8, 14",
    status: "em_acompanhamento",
    behavioral_profile: {
      financial_organization_score: 2, savings_discipline_score: 1, money_anxiety_score: 9,
      financial_confidence_score: 2, impulse_spending_score: 8, risk_tolerance_score: 2,
      spending_triggers: "Compras por impulso quando está estressada, parcelamentos no cartão para 'aliviar' o orçamento, presentes para os filhos por culpa do divórcio",
      family_money_history: "Pais sempre viveram endividados, nunca houve educação financeira em casa, dinheiro era assunto tabu",
      computed_profile: "Ansioso",
    },
  }).eq("id", clientId);

  // Limpa todas as tabelas em paralelo
  await Promise.all([
    admin.from("income").delete().eq("client_id", clientId),
    admin.from("expenses").delete().eq("client_id", clientId),
    admin.from("debts").delete().eq("client_id", clientId),
    admin.from("assets").delete().eq("client_id", clientId),
    admin.from("insurance").delete().eq("client_id", clientId),
    admin.from("goals").delete().eq("client_id", clientId),
    admin.from("diagnosis").delete().eq("client_id", clientId),
    admin.from("investment_recommendations").delete().eq("client_id", clientId),
    admin.from("implementation_sessions").delete().eq("client_id", clientId),
    admin.from("monitoring_snapshots").delete().eq("client_id", clientId),
  ]);

  // Limpa action items + plans
  const { data: oldPlans } = await admin.from("action_plans").select("id").eq("client_id", clientId);
  if (oldPlans?.length) {
    await admin.from("action_items").delete().in("action_plan_id", oldPlans.map((p: any) => p.id));
    await admin.from("action_plans").delete().eq("client_id", clientId);
  }

  // Inserts em paralelo
  const { data: plan } = await admin.from("action_plans")
    .insert({ client_id: clientId, title: `Plano de Recuperação Financeira - ${fullName}` })
    .select("id").single();
  const planId = plan!.id;

  await Promise.all([
    admin.from("income").insert([
      { client_id: clientId, description: "Salário CLT - Auxiliar administrativa", amount: 2800, frequency: "mensal", stability: "alta", is_primary: true },
      { client_id: clientId, description: "Pensão alimentícia (filhos)", amount: 1200, frequency: "mensal", stability: "media", is_primary: false },
      { client_id: clientId, description: "Bicos de revenda de cosméticos", amount: 400, frequency: "mensal", stability: "baixa", is_primary: false },
    ]),
    admin.from("expenses").insert([
      { client_id: clientId, category: "Moradia", description: "Aluguel apartamento 2 quartos", amount: 1800, is_fixed: true },
      { client_id: clientId, category: "Moradia", description: "Condomínio + IPTU + água", amount: 450, is_fixed: true },
      { client_id: clientId, category: "Moradia", description: "Energia elétrica", amount: 280, is_fixed: false },
      { client_id: clientId, category: "Alimentação", description: "Supermercado", amount: 1200, is_fixed: false },
      { client_id: clientId, category: "Alimentação", description: "Delivery e fast food", amount: 450, is_fixed: false },
      { client_id: clientId, category: "Transporte", description: "Transporte público + Uber", amount: 380, is_fixed: false },
      { client_id: clientId, category: "Educação", description: "Material escolar e atividades dos filhos", amount: 350, is_fixed: false },
      { client_id: clientId, category: "Saúde", description: "Medicamentos e consultas particulares", amount: 280, is_fixed: false },
      { client_id: clientId, category: "Lazer", description: "Passeios com os filhos", amount: 200, is_fixed: false },
      { client_id: clientId, category: "Assinaturas", description: "Netflix, Spotify, celular", amount: 220, is_fixed: true },
      { client_id: clientId, category: "Vestuário", description: "Roupas (parceladas no cartão)", amount: 350, is_fixed: false },
      { client_id: clientId, category: "Dívidas", description: "Mínimo do cartão de crédito", amount: 800, is_fixed: true },
      { client_id: clientId, category: "Dívidas", description: "Parcelas do cheque especial", amount: 450, is_fixed: true },
      { client_id: clientId, category: "Dívidas", description: "Crediário lojas", amount: 320, is_fixed: true },
    ]),
    admin.from("debts").insert([
      { client_id: clientId, type: "Cartão de crédito rotativo", creditor: "Nubank", total_amount: 18500, monthly_payment: 800, interest_rate: 14.5, remaining_months: 36 },
      { client_id: clientId, type: "Cartão de crédito rotativo", creditor: "Itaucard", total_amount: 9800, monthly_payment: 450, interest_rate: 13.9, remaining_months: 30 },
      { client_id: clientId, type: "Cheque especial", creditor: "Banco do Brasil", total_amount: 4200, monthly_payment: 450, interest_rate: 8.2, remaining_months: 12 },
      { client_id: clientId, type: "Crediário (loja de móveis)", creditor: "Casas Bahia", total_amount: 3800, monthly_payment: 320, interest_rate: 4.5, remaining_months: 14 },
      { client_id: clientId, type: "Empréstimo consignado", creditor: "Caixa Econômica", total_amount: 12000, monthly_payment: 580, interest_rate: 2.1, remaining_months: 24 },
      { client_id: clientId, type: "Empréstimo familiar", creditor: "Irmã (sem juros)", total_amount: 5000, monthly_payment: 200, interest_rate: 0, remaining_months: 25 },
    ]),
    admin.from("assets").insert([
      { client_id: clientId, type: "Veículo", description: "Fiat Uno 2010 (quitado)", estimated_value: 18000 },
      { client_id: clientId, type: "Eletrodomésticos", description: "Móveis e eletros da casa", estimated_value: 8000 },
      { client_id: clientId, type: "Poupança", description: "Conta poupança CEF (saldo mínimo)", estimated_value: 320 },
    ]),
    admin.from("goals").insert([
      { client_id: clientId, description: "Quitar todas as dívidas de cartão e cheque especial", target_amount: 32500, priority: "alta", deadline: "2027-12-31" },
      { client_id: clientId, description: "Construir reserva de emergência de 3 meses", target_amount: 13200, priority: "alta", deadline: "2027-06-30" },
      { client_id: clientId, description: "Contratar plano de saúde para a família", target_amount: 800, priority: "media", deadline: "2026-09-30" },
      { client_id: clientId, description: "Voltar a estudar (técnico em administração)", target_amount: 4800, priority: "media", deadline: "2027-12-31" },
    ]),
    admin.from("diagnosis").insert({
      client_id: clientId, total_income: 4400, total_expenses: 7530, total_assets: 26320, total_debts: 53300,
      savings_capacity: -3130, debt_ratio: 1211.4, risk_classification: "E",
      notes: "Cliente em situação crítica de endividamento. Despesas mensais 71% acima da renda, déficit de R$ 3.130/mês coberto via novas dívidas (rolagem). Patrimônio líquido negativo de R$ 26.980. Sem reserva, sem seguros. Prioridade: estancar juros, renegociar dívidas e estabilizar orçamento.",
    }),
    admin.from("monitoring_snapshots").insert([
      { client_id: clientId, snapshot_date: "2025-11-30", total_income: 4400, total_expenses: 8200, total_assets: 26000, total_debts: 58000, savings_rate: -86.4, emergency_reserve_months: 0.04, plan_completion_pct: 0 },
      { client_id: clientId, snapshot_date: "2026-01-31", total_income: 4400, total_expenses: 7900, total_assets: 26100, total_debts: 56200, savings_rate: -79.5, emergency_reserve_months: 0.04, plan_completion_pct: 15 },
      { client_id: clientId, snapshot_date: "2026-03-31", total_income: 4400, total_expenses: 7530, total_assets: 26320, total_debts: 53300, savings_rate: -71.1, emergency_reserve_months: 0.04, plan_completion_pct: 35 },
    ]),
    admin.from("implementation_sessions").insert([
      { client_id: clientId, category: "ajuste_orcamento", title: "Diagnóstico inicial e mapeamento de dívidas", status: "concluido", session_date: "2025-11-20", notes: "Identificado endividamento crítico." },
      { client_id: clientId, category: "renegociacao_dividas", title: "Primeira rodada de negociação Nubank", status: "concluido", session_date: "2026-01-15", notes: "Conseguimos parcelar rotativo em 24x." },
      { client_id: clientId, category: "ajuste_orcamento", title: "Revisão de despesas fixas", status: "concluido", session_date: "2026-02-10", notes: "Cortamos R$ 380 em assinaturas." },
    ]),
  ]);

  const { data: parents } = await admin.from("action_items").insert([
    { action_plan_id: planId, area: "dividas", description: "Renegociar dívidas de cartão e cheque especial", objective: "Reduzir juros", status: "em_andamento", deadline: "2026-06-30", financial_impact: 1800, responsible: "Novare" },
    { action_plan_id: planId, area: "despesas", description: "Cortar despesas não essenciais", objective: "Eliminar déficit", status: "em_andamento", deadline: "2026-05-31", financial_impact: 1500, responsible: "Cliente" },
    { action_plan_id: planId, area: "renda", description: "Aumentar renda com nova fonte", objective: "+R$ 800-1.200/mês", status: "em_andamento", deadline: "2026-08-31", financial_impact: 1000, responsible: "Cliente" },
    { action_plan_id: planId, area: "comportamento", description: "Acompanhamento comportamental quinzenal", objective: "Quebrar ciclo de impulso", status: "em_andamento", deadline: "2026-12-31", financial_impact: 500, responsible: "Novare" },
  ]).select("id, area");

  if (parents) {
    const divida = parents.find((p: any) => p.area === "dividas")!;
    const desp = parents.find((p: any) => p.area === "despesas")!;
    await admin.from("action_items").insert([
      { action_plan_id: planId, parent_id: divida.id, area: "dividas", description: "Negociar Nubank", status: "em_andamento", responsible: "Novare" },
      { action_plan_id: planId, parent_id: divida.id, area: "dividas", description: "Quitar cheque especial com consignado", status: "pendente", responsible: "Cliente" },
      { action_plan_id: planId, parent_id: desp.id, area: "despesas", description: "Cancelar Netflix e reduzir Spotify", status: "concluido", responsible: "Cliente" },
      { action_plan_id: planId, parent_id: desp.id, area: "despesas", description: "Eliminar delivery", status: "em_andamento", responsible: "Cliente" },
    ]);
  }

  // Final: garante status correto
  await admin.from("clients").update({ status: "em_acompanhamento" }).eq("id", clientId);
  return clientId;
}

async function seedLucas(admin: any) {
  const email = "lucas.teste@novare.com";
  const fullName = "Lucas Mendes Silva";
  const { userId, clientId } = await ensureUserAndClient(admin, email, "Novare@2026", fullName);

  await admin.from("profiles").update({ full_name: fullName, email }).eq("user_id", userId);

  await admin.from("clients").update({
    cpf: "987.654.321-00", date_of_birth: "1990-03-22", marital_status: "casado",
    property_regime: "comunhao_parcial", profession: "Engenheiro de Software", company: "TechNova Solutions",
    years_in_profession: 8, city: "Campinas", state: "SP", dependents_count: 1, dependents_ages: "3",
    status: "em_acompanhamento",
    behavioral_profile: {
      financial_organization_score: 6, savings_discipline_score: 5, money_anxiety_score: 4,
      financial_confidence_score: 7, impulse_spending_score: 3, risk_tolerance_score: 6,
      spending_triggers: "Viagens, eletrônicos, presentes",
      family_money_history: "Pai contador, sempre houve conversa sobre finanças",
      computed_profile: "Metódico",
    },
  }).eq("id", clientId);

  await Promise.all([
    admin.from("income").delete().eq("client_id", clientId),
    admin.from("expenses").delete().eq("client_id", clientId),
    admin.from("debts").delete().eq("client_id", clientId),
    admin.from("assets").delete().eq("client_id", clientId),
    admin.from("insurance").delete().eq("client_id", clientId),
    admin.from("goals").delete().eq("client_id", clientId),
    admin.from("diagnosis").delete().eq("client_id", clientId),
    admin.from("investment_recommendations").delete().eq("client_id", clientId),
    admin.from("implementation_sessions").delete().eq("client_id", clientId),
    admin.from("monitoring_snapshots").delete().eq("client_id", clientId),
  ]);

  const { data: oldPlans } = await admin.from("action_plans").select("id").eq("client_id", clientId);
  if (oldPlans?.length) {
    await admin.from("action_items").delete().in("action_plan_id", oldPlans.map((p: any) => p.id));
    await admin.from("action_plans").delete().eq("client_id", clientId);
  }

  const { data: plan } = await admin.from("action_plans")
    .insert({ client_id: clientId, title: `Plano de Ação - ${fullName}` })
    .select("id").single();
  const planId = plan!.id;

  await Promise.all([
    admin.from("income").insert([
      { client_id: clientId, description: "Salário CLT - TechNova", amount: 18000, frequency: "mensal", stability: "alta", is_primary: true },
      { client_id: clientId, description: "Consultoria técnica (PJ)", amount: 4000, frequency: "mensal", stability: "media", is_primary: false },
      { client_id: clientId, description: "Dividendos ações", amount: 600, frequency: "mensal", stability: "baixa", is_primary: false },
    ]),
    admin.from("expenses").insert([
      { client_id: clientId, category: "Moradia", description: "Parcela financiamento imóvel", amount: 4200, is_fixed: true },
      { client_id: clientId, category: "Moradia", description: "Condomínio + IPTU", amount: 1100, is_fixed: true },
      { client_id: clientId, category: "Alimentação", description: "Supermercado e feira", amount: 1800, is_fixed: false },
      { client_id: clientId, category: "Alimentação", description: "Restaurantes e delivery", amount: 1200, is_fixed: false },
      { client_id: clientId, category: "Transporte", description: "Combustível", amount: 600, is_fixed: false },
      { client_id: clientId, category: "Educação", description: "Escola do filho", amount: 1500, is_fixed: true },
      { client_id: clientId, category: "Saúde", description: "Plano de saúde familiar", amount: 1200, is_fixed: true },
      { client_id: clientId, category: "Lazer", description: "Viagens e entretenimento", amount: 800, is_fixed: false },
      { client_id: clientId, category: "Assinaturas", description: "Streaming, cloud, apps", amount: 350, is_fixed: true },
      { client_id: clientId, category: "Vestuário", description: "Roupas família", amount: 500, is_fixed: false },
    ]),
    admin.from("debts").insert([
      { client_id: clientId, type: "Financiamento imobiliário", creditor: "Caixa", total_amount: 320000, monthly_payment: 4200, interest_rate: 0.75, remaining_months: 240 },
      { client_id: clientId, type: "Empréstimo pessoal", creditor: "Itaú", total_amount: 15000, monthly_payment: 850, interest_rate: 2.5, remaining_months: 20 },
    ]),
    admin.from("assets").insert([
      { client_id: clientId, type: "Imóvel", description: "Apartamento Campinas", estimated_value: 580000 },
      { client_id: clientId, type: "Veículo", description: "Toyota Corolla 2023", estimated_value: 120000 },
      { client_id: clientId, type: "Investimentos", description: "CDB + Tesouro Selic", estimated_value: 45000 },
      { client_id: clientId, type: "Investimentos", description: "Ações", estimated_value: 32000 },
      { client_id: clientId, type: "Poupança", description: "Reserva de emergência", estimated_value: 25000 },
    ]),
    admin.from("insurance").insert([
      { client_id: clientId, type: "Seguro de vida", provider: "SulAmérica", monthly_premium: 180, coverage_amount: 500000 },
      { client_id: clientId, type: "Seguro automóvel", provider: "Porto Seguro", monthly_premium: 320, coverage_amount: 130000 },
      { client_id: clientId, type: "Seguro residencial", provider: "Bradesco", monthly_premium: 85, coverage_amount: 600000 },
    ]),
    admin.from("goals").insert([
      { client_id: clientId, description: "Reserva de emergência 12 meses", target_amount: 160000, priority: "alta", deadline: "2027-12-31" },
      { client_id: clientId, description: "Quitar empréstimo Itaú", target_amount: 15000, priority: "alta", deadline: "2027-06-30" },
      { client_id: clientId, description: "Previdência privada para filho", target_amount: 200000, priority: "media", deadline: "2040-01-01" },
    ]),
    admin.from("diagnosis").insert({
      client_id: clientId, total_income: 22600, total_expenses: 13250, total_assets: 802000, total_debts: 335000,
      savings_capacity: 9350, debt_ratio: 1482.3, risk_classification: "B",
      notes: "Cliente com boa renda e patrimônio relevante.",
    }),
    admin.from("investment_recommendations").insert([
      { client_id: clientId, product_name: "Tesouro Selic 2029", product_type: "renda_fixa", allocation_pct: 20, expected_return: "Selic", risk_level: "baixo", liquidity: "D+1", min_investment: 30, status: "aplicado", priority: 1, invested_amount: 25000, rationale: "Reserva de emergência." },
      { client_id: clientId, product_name: "Tesouro IPCA+ 2029", product_type: "renda_fixa", allocation_pct: 20, expected_return: "IPCA+6,5%", risk_level: "baixo", liquidity: "Vencimento", min_investment: 30, status: "aplicado", priority: 2, invested_amount: 20000, rationale: "Proteção inflação." },
      { client_id: clientId, product_name: "FII HGLG11", product_type: "renda_variavel", allocation_pct: 15, expected_return: "DY ~9%", risk_level: "medio", liquidity: "D+2", min_investment: 170, status: "aplicado", priority: 4, invested_amount: 12000, rationale: "Renda passiva." },
    ]),
    admin.from("implementation_sessions").insert([
      { client_id: clientId, category: "ajuste_orcamento", title: "Mapeamento de despesas", status: "concluido", session_date: "2025-11-15", notes: "Oportunidades de economia" },
      { client_id: clientId, category: "organizacao_reservas", title: "Abertura de conta XP", status: "concluido", session_date: "2026-01-08", notes: "Conta aberta" },
    ]),
    admin.from("monitoring_snapshots").insert([
      { client_id: clientId, snapshot_date: "2025-11-30", total_income: 22600, total_expenses: 14800, total_assets: 750000, total_debts: 340000, savings_rate: 34.5, emergency_reserve_months: 1.2, plan_completion_pct: 0 },
      { client_id: clientId, snapshot_date: "2026-03-31", total_income: 22600, total_expenses: 13250, total_assets: 802000, total_debts: 335000, savings_rate: 41.4, emergency_reserve_months: 1.9, plan_completion_pct: 50 },
    ]),
    admin.from("action_items").insert([
      { action_plan_id: planId, area: "dividas", description: "Quitar empréstimo Itaú", objective: "Eliminar dívida", status: "em_andamento", deadline: "2027-06-30", financial_impact: 850, responsible: "Cliente" },
      { action_plan_id: planId, area: "investimentos", description: "Diversificar carteira", objective: "Atingir R$ 200k", status: "em_andamento", deadline: "2029-12-31", financial_impact: 3000, responsible: "Novare" },
      { action_plan_id: planId, area: "protecao", description: "Revisar seguros", objective: "Otimizar custo", status: "concluido", deadline: "2026-03-15", financial_impact: 100, responsible: "Novare" },
    ]),
  ]);

  await admin.from("clients").update({ status: "em_acompanhamento" }).eq("id", clientId);
  return clientId;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData } = await callerClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await callerClient.rpc("has_role", {
      _user_id: claimsData.claims.sub, _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // RODA OS DOIS EM PARALELO — máximo de velocidade
    const results = await Promise.allSettled([seedMaria(admin), seedLucas(admin)]);

    const errors = results
      .map((r, i) => r.status === "rejected" ? { client: i === 0 ? "Maria" : "Lucas", error: String(r.reason) } : null)
      .filter(Boolean);

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        seeded: results.filter((r) => r.status === "fulfilled").length,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("seed-all-demo-clients error:", err);
    return new Response(JSON.stringify({ error: "Erro interno", details: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
