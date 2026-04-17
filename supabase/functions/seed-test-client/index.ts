import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ── AUTH: Verify caller is authenticated ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── AUTH: Verify caller is admin ──
    const { data: isAdmin } = await callerClient.rpc("has_role", {
      _user_id: claimsData.claims.sub,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── INPUT VALIDATION ──
    let body: any = {};
    try { body = await req.json(); } catch {}

    const email = body.email || "lucas.teste@novare.com";
    const password = body.password || "Novare@2026";
    const fullName = body.fullName || "Lucas Mendes Silva";

    if (typeof email !== "string" || email.length > 255) {
      return new Response(JSON.stringify({ error: "Email inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: userData, error: userErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (userErr && !userErr.message?.includes("already been registered")) throw userErr;

    let userId: string;
    if (userErr) {
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users?.find((u: any) => u.email === email);
      if (!existing) throw new Error("User exists but not found");
      userId = existing.id;
    } else {
      userId = userData.user!.id;
    }

    await new Promise((r) => setTimeout(r, 1500));

    const { data: clientRow } = await admin.from("clients").select("id").eq("user_id", userId).single();
    if (!clientRow) throw new Error("Client record not found after trigger");
    const clientId = clientRow.id;

    await admin.from("clients").update({
      cpf: "987.654.321-00", date_of_birth: "1990-03-22", marital_status: "casado",
      property_regime: "comunhao_parcial",
      profession: "Engenheiro de Software", company: "TechNova Solutions",
      years_in_profession: 8, city: "Campinas", state: "SP", dependents_count: 1,
      dependents_ages: "3",
      status: "em_acompanhamento",
      behavioral_profile: {
        financial_organization_score: 6, savings_discipline_score: 5, money_anxiety_score: 4,
        financial_confidence_score: 7, impulse_spending_score: 3, risk_tolerance_score: 6,
        spending_triggers: "Viagens, eletrônicos, presentes para a família",
        family_money_history: "Pai era contador, sempre houve conversa sobre finanças em casa",
        computed_profile: "Metódico",
      },
    }).eq("id", clientId);

    await admin.from("profiles").update({ full_name: fullName, email }).eq("user_id", userId);

    await admin.from("income").delete().eq("client_id", clientId);
    await admin.from("income").insert([
      { client_id: clientId, description: "Salário CLT - TechNova Solutions", amount: 18000, frequency: "mensal", stability: "alta", is_primary: true },
      { client_id: clientId, description: "Consultoria técnica (PJ)", amount: 4000, frequency: "mensal", stability: "media", is_primary: false },
      { client_id: clientId, description: "Dividendos ações", amount: 600, frequency: "mensal", stability: "baixa", is_primary: false },
    ]);

    await admin.from("expenses").delete().eq("client_id", clientId);
    await admin.from("expenses").insert([
      { client_id: clientId, category: "Moradia", description: "Parcela financiamento imóvel", amount: 4200, is_fixed: true },
      { client_id: clientId, category: "Moradia", description: "Condomínio + IPTU", amount: 1100, is_fixed: true },
      { client_id: clientId, category: "Alimentação", description: "Supermercado e feira", amount: 1800, is_fixed: false },
      { client_id: clientId, category: "Alimentação", description: "Restaurantes e delivery", amount: 1200, is_fixed: false },
      { client_id: clientId, category: "Transporte", description: "Combustível", amount: 600, is_fixed: false },
      { client_id: clientId, category: "Educação", description: "Escola do filho + material", amount: 1500, is_fixed: true },
      { client_id: clientId, category: "Saúde", description: "Plano de saúde familiar", amount: 1200, is_fixed: true },
      { client_id: clientId, category: "Lazer", description: "Viagens e entretenimento", amount: 800, is_fixed: false },
      { client_id: clientId, category: "Assinaturas", description: "Streaming, cloud, apps", amount: 350, is_fixed: true },
      { client_id: clientId, category: "Vestuário", description: "Roupas família", amount: 500, is_fixed: false },
    ]);

    await admin.from("debts").delete().eq("client_id", clientId);
    await admin.from("debts").insert([
      { client_id: clientId, type: "Financiamento imobiliário", creditor: "Caixa Econômica", total_amount: 320000, monthly_payment: 4200, interest_rate: 0.75, remaining_months: 240 },
      { client_id: clientId, type: "Empréstimo pessoal", creditor: "Itaú", total_amount: 15000, monthly_payment: 850, interest_rate: 2.5, remaining_months: 20 },
    ]);

    await admin.from("assets").delete().eq("client_id", clientId);
    await admin.from("assets").insert([
      { client_id: clientId, type: "Imóvel", description: "Apartamento 3 quartos - Campinas", estimated_value: 580000 },
      { client_id: clientId, type: "Veículo", description: "Toyota Corolla 2023", estimated_value: 120000 },
      { client_id: clientId, type: "Investimentos", description: "CDB + Tesouro Selic", estimated_value: 45000 },
      { client_id: clientId, type: "Investimentos", description: "Ações (carteira diversificada)", estimated_value: 32000 },
      { client_id: clientId, type: "Poupança", description: "Reserva de emergência", estimated_value: 25000 },
    ]);

    await admin.from("insurance").delete().eq("client_id", clientId);
    await admin.from("insurance").insert([
      { client_id: clientId, type: "Seguro de vida", provider: "SulAmérica", monthly_premium: 180, coverage_amount: 500000 },
      { client_id: clientId, type: "Seguro automóvel", provider: "Porto Seguro", monthly_premium: 320, coverage_amount: 130000 },
      { client_id: clientId, type: "Seguro residencial", provider: "Bradesco Seguros", monthly_premium: 85, coverage_amount: 600000 },
    ]);

    await admin.from("goals").delete().eq("client_id", clientId);
    await admin.from("goals").insert([
      { client_id: clientId, description: "Ampliar reserva de emergência para 12 meses", target_amount: 160000, priority: "alta", deadline: "2027-12-31" },
      { client_id: clientId, description: "Quitar empréstimo pessoal do Itaú", target_amount: 15000, priority: "alta", deadline: "2027-06-30" },
      { client_id: clientId, description: "Iniciar previdência privada para o filho", target_amount: 200000, priority: "media", deadline: "2040-01-01" },
      { client_id: clientId, description: "Atingir R$ 200k em investimentos diversificados", target_amount: 200000, priority: "media", deadline: "2029-12-31" },
    ]);

    await admin.from("diagnosis").delete().eq("client_id", clientId);
    await admin.from("diagnosis").insert({
      client_id: clientId, total_income: 22600, total_expenses: 13250,
      total_assets: 802000, total_debts: 335000, savings_capacity: 9350,
      debt_ratio: 1482.3, risk_classification: "B",
      notes: "Cliente com boa renda e patrimônio relevante.",
    });

    await admin.from("action_items").delete().in("action_plan_id",
      (await admin.from("action_plans").select("id").eq("client_id", clientId)).data?.map((p: any) => p.id) || []
    );
    await admin.from("action_plans").delete().eq("client_id", clientId);

    const { data: plan } = await admin.from("action_plans").insert({
      client_id: clientId, title: `Plano de Ação - ${fullName}`,
    }).select("id").single();

    const planId = plan!.id;

    const { data: parents } = await admin.from("action_items").insert([
      { action_plan_id: planId, area: "dividas", description: "Quitar empréstimo pessoal Itaú", objective: "Eliminar dívida com juros altos", status: "em_andamento", deadline: "2027-06-30", financial_impact: 850, responsible: "Cliente" },
      { action_plan_id: planId, area: "investimentos", description: "Diversificar carteira de investimentos", objective: "Atingir R$ 200k em investimentos", status: "em_andamento", deadline: "2029-12-31", financial_impact: 3000, responsible: "Novare" },
      { action_plan_id: planId, area: "protecao", description: "Revisar e otimizar seguros", objective: "Cobertura adequada com melhor custo-benefício", status: "concluido", deadline: "2026-03-15", financial_impact: 100, responsible: "Novare" },
      { action_plan_id: planId, area: "despesas", description: "Otimizar orçamento familiar", objective: "Aumentar taxa de poupança para 45%", status: "em_andamento", deadline: "2026-06-30", financial_impact: 1500, responsible: "Cliente" },
      { action_plan_id: planId, area: "renda", description: "Estruturar consultoria PJ", objective: "Otimizar tributação da renda extra", status: "concluido", deadline: "2026-02-28", financial_impact: 400, responsible: "Novare" },
    ]).select("id, area");

    if (parents) {
      const divida = parents.find(p => p.area === "dividas")!;
      const invest = parents.find(p => p.area === "investimentos")!;
      const desp = parents.find(p => p.area === "despesas")!;

      await admin.from("action_items").insert([
        { action_plan_id: planId, parent_id: divida.id, area: "dividas", description: "Levantar saldo devedor atualizado", status: "concluido", responsible: "Cliente" },
        { action_plan_id: planId, parent_id: divida.id, area: "dividas", description: "Simular quitação antecipada com desconto", status: "concluido", responsible: "Novare" },
        { action_plan_id: planId, parent_id: divida.id, area: "dividas", description: "Executar pagamento antecipado", status: "pendente", responsible: "Cliente" },
        { action_plan_id: planId, parent_id: invest.id, area: "investimentos", description: "Abrir conta na XP Investimentos", status: "concluido", responsible: "Cliente" },
        { action_plan_id: planId, parent_id: invest.id, area: "investimentos", description: "Aplicar R$ 10k em Tesouro IPCA+ 2029", status: "concluido", responsible: "Cliente" },
        { action_plan_id: planId, parent_id: invest.id, area: "investimentos", description: "Iniciar aporte mensal de R$ 2k em FIIs", status: "em_andamento", responsible: "Novare" },
        { action_plan_id: planId, parent_id: invest.id, area: "investimentos", description: "Avaliar fundos de previdência para o filho", status: "pendente", responsible: "Novare" },
        { action_plan_id: planId, parent_id: desp.id, area: "despesas", description: "Mapear gastos variáveis dos últimos 3 meses", status: "concluido", responsible: "Cliente" },
        { action_plan_id: planId, parent_id: desp.id, area: "despesas", description: "Reduzir delivery para R$ 600/mês", status: "em_andamento", responsible: "Cliente" },
        { action_plan_id: planId, parent_id: desp.id, area: "despesas", description: "Renegociar plano de saúde familiar", status: "pendente", responsible: "Novare" },
      ]);
    }

    await admin.from("investment_recommendations").delete().eq("client_id", clientId);
    await admin.from("investment_recommendations").insert([
      { client_id: clientId, product_name: "Tesouro Selic 2029", product_type: "renda_fixa", allocation_pct: 20, expected_return: "Selic (≈14,25% a.a.)", risk_level: "baixo", liquidity: "D+1", min_investment: 30, status: "aplicado", priority: 1, invested_amount: 25000, rationale: "Base da reserva de emergência." },
      { client_id: clientId, product_name: "Tesouro IPCA+ 2029", product_type: "renda_fixa", allocation_pct: 20, expected_return: "IPCA + 6,5% a.a.", risk_level: "baixo", liquidity: "Vencimento 2029", min_investment: 30, status: "aplicado", priority: 2, invested_amount: 20000, rationale: "Proteção contra inflação." },
      { client_id: clientId, product_name: "FII HGLG11 (Logística)", product_type: "renda_variavel", allocation_pct: 15, expected_return: "Dividend Yield ~9% a.a.", risk_level: "medio", liquidity: "D+2", min_investment: 170, status: "aplicado", priority: 4, invested_amount: 12000, rationale: "Renda passiva mensal." },
    ]);

    await admin.from("implementation_sessions").delete().eq("client_id", clientId);
    await admin.from("implementation_sessions").insert([
      { client_id: clientId, category: "ajuste_orcamento", title: "Mapeamento de despesas familiares", status: "concluido", session_date: "2025-11-15", notes: "Identificamos oportunidades de economia" },
      { client_id: clientId, category: "organizacao_reservas", title: "Abertura de conta na XP", status: "concluido", session_date: "2026-01-08", notes: "Conta aberta" },
    ]);

    await admin.from("monitoring_snapshots").delete().eq("client_id", clientId);
    await admin.from("monitoring_snapshots").insert([
      { client_id: clientId, snapshot_date: "2025-11-30", total_income: 22600, total_expenses: 14800, total_assets: 750000, total_debts: 340000, savings_rate: 34.5, emergency_reserve_months: 1.2, plan_completion_pct: 0 },
      { client_id: clientId, snapshot_date: "2026-03-31", total_income: 22600, total_expenses: 13250, total_assets: 802000, total_debts: 335000, savings_rate: 41.4, emergency_reserve_months: 1.9, plan_completion_pct: 50 },
    ]);

    // Never expose credentials in response
    return new Response(
      JSON.stringify({ success: true, clientId, userId, message: "Cliente de teste criado!" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("seed-test-client error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
