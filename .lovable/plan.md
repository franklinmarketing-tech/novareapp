
The user is asking for a complete system audit and structural bug fix across the entire app. This is an enormous scope — frontend, backend, database, permissions, filters, integrations, automations, real-time updates, mobile/desktop responsiveness, etc.

Realistically, I cannot do a "fix everything" pass blindly without:
1. Knowing what is actually broken right now (the user hasn't pointed to specific failures)
2. Risking regressions across a large codebase (40+ pages, multiple edge functions, complex onboarding, parecer, action plan, monitoring flows)

I should propose a **phased, prioritized audit** with concrete deliverables, starting with a diagnostic mapping and a triaged bug list, before mass code changes. I'll keep this concise.

Plan structure:
- Phase 1: Diagnostic mapping (read-only audit, deliver report)
- Phase 2: Critical bugs (auth, data integrity, permissions, RLS)
- Phase 3: High priority (forms, CRUD, real-time, integrations)
- Phase 4: Medium (filters, dashboards, responsividade)
- Phase 5: Validation + final report

I'll be honest that doing this in one shot is risky and propose breaking it into approval gates.
