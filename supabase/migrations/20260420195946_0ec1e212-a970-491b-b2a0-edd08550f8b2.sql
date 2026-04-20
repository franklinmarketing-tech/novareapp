
-- Limpa flags genéricas e cria conjunto útil e bem documentado
DELETE FROM public.feature_flags;

INSERT INTO public.feature_flags (key, name, description, enabled, rollout_pct, target_roles) VALUES
  ('ai_recommendations', 'IA — Recomendações automáticas', 'Liga o botão "Gerar com IA" no Parecer e em Recomendações de Investimento. Quando desligado, o admin precisa preencher tudo manualmente. Útil desligar se a OpenAI estiver instável ou para conter custos.', true, 100, ARRAY['admin','super_admin']),
  ('ai_notes_analysis', 'IA — Análise de notas do consultor', 'Liga a análise automática das notas escritas pelo consultor (resumo, sentimento, próximos passos sugeridos).', false, 0, ARRAY['admin','super_admin']),
  ('client_self_onboarding', 'Cliente — Auto-onboarding', 'Permite que o próprio cliente preencha o onboarding sem intervenção do admin. Quando desligado, só o admin consegue editar dados na fase de onboarding.', true, 100, ARRAY['client']),
  ('client_pdf_download', 'Cliente — Download do parecer em PDF', 'Mostra/oculta o botão de baixar o parecer em PDF na área do cliente.', true, 100, ARRAY['client']),
  ('client_action_plan_edit', 'Cliente — Editar plano de ação', 'Permite que o cliente marque ações como concluídas no próprio plano. Desligado = somente leitura.', true, 100, ARRAY['client']),
  ('email_transactional', 'Emails transacionais', 'Liga o envio de emails (boas-vindas, parecer pronto, lembretes). Desligar em manutenção do Resend ou para parar disparos em emergência.', true, 100, ARRAY['admin','client','super_admin']),
  ('admin_bulk_actions', 'Admin — Ações em lote', 'Habilita seleção múltipla e ações em massa na lista de clientes (exportar, mudar status, arquivar).', false, 0, ARRAY['admin','super_admin']),
  ('advanced_monitoring_charts', 'Monitoramento — Gráficos avançados', 'Substitui os gráficos básicos por versão com drill-down, comparativo histórico e projeção.', false, 0, ARRAY['admin','client','super_admin']),
  ('beta_market_data', 'Beta — Dados de mercado em tempo real', 'Habilita o widget de cotações (CDI, IPCA, Selic, dólar) na sidebar do cliente.', false, 0, ARRAY['admin','client','super_admin']),
  ('maintenance_banner_demo', 'Banner — Demo de manutenção', 'Liga um banner amarelo de aviso "Estamos em ajustes" no topo do app. Útil para testar a estética sem ativar manutenção real.', false, 0, ARRAY['admin','client','super_admin']);
