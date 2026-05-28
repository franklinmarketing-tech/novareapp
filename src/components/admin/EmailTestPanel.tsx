import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const TEMPLATES = [
  { id: "welcome", label: "Boas-vindas (sem senha)" },
  { id: "welcome-with-password", label: "Boas-vindas com senha temporária" },
  { id: "snapshot-update", label: "Atualização patrimonial" },
  { id: "task-completed", label: "Ação concluída" },
  { id: "goal-achieved", label: "Meta atingida" },
  { id: "diagnosis-update", label: "Diagnóstico atualizado" },
] as const;

type TemplateId = (typeof TEMPLATES)[number]["id"];

const SAMPLE_DATA: Record<TemplateId, Record<string, unknown>> = {
  welcome: { clientName: "Cliente Teste" },
  "welcome-with-password": {
    clientName: "Cliente Teste",
    email: "destinatario@exemplo.com",
    password: "Teste@123",
  },
  "snapshot-update": {
    clientName: "Cliente Teste",
    patrimonio: 125000,
    savingsRate: 18,
    date: new Date().toLocaleDateString("pt-BR"),
  },
  "task-completed": {
    clientName: "Cliente Teste",
    taskDescription: "Quitar 50% do cartão de crédito",
    overallProgress: 64,
  },
  "goal-achieved": {
    clientName: "Cliente Teste",
    goalDescription: "Reserva de emergência de 6 meses",
  },
  "diagnosis-update": {
    clientName: "Cliente Teste",
    totalIncome: 12000,
    totalExpenses: 8500,
    riskClassification: "B — Bom",
    savingsCapacity: 18.4,
  },
};

export function EmailTestPanel() {
  const { user } = useAuth();
  const [to, setTo] = useState(user?.email || "");
  const [template, setTemplate] = useState<TemplateId>("welcome-with-password");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<
    | { status: "ok"; id?: string }
    | { status: "error"; message: string; detail?: unknown }
    | null
  >(null);

  const handleSend = async () => {
    if (!to.trim() || !to.includes("@")) {
      toast({ title: "Email inválido", description: "Informe um destinatário válido.", variant: "destructive" });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const sampleData = { ...SAMPLE_DATA[template], email: to };
      const { data, error } = await supabase.functions.invoke("send-client-email", {
        body: {
          to: to.trim(),
          templateName: template,
          templateData: sampleData,
        },
      });
      if (error) {
        setResult({ status: "error", message: error.message });
        toast({ title: "Falha no envio", description: error.message, variant: "destructive" });
      } else if (data?.error) {
        setResult({ status: "error", message: data.error, detail: data.detail });
        toast({ title: "Falha no envio", description: data.error, variant: "destructive" });
      } else {
        setResult({ status: "ok", id: data?.id });
        toast({ title: "Email enviado!", description: `Confira a caixa de ${to}` });
      }
    } catch (err: any) {
      setResult({ status: "error", message: err?.message || "Erro desconhecido" });
      toast({ title: "Erro", description: err?.message || "Tente novamente", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-muted-foreground" />
          <div>
            <CardTitle className="text-lg">Testar envio de e-mail</CardTitle>
            <CardDescription>
              Envia um e-mail de teste usando um dos templates do app. Útil para validar a configuração do Resend antes de cadastrar clientes reais.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email-test-to">Destinatário</Label>
          <Input
            id="email-test-to"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="seu-email@exemplo.com"
            disabled={sending}
          />
          <p className="text-[11px] text-muted-foreground">
            Sugestão: use seu próprio email para conferir como o cliente recebe.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email-test-template">Template</Label>
          <select
            id="email-test-template"
            value={template}
            onChange={(e) => setTemplate(e.target.value as TemplateId)}
            disabled={sending}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
          >
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        <Button onClick={handleSend} disabled={sending} className="gap-2">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sending ? "Enviando..." : "Enviar teste"}
        </Button>

        {result?.status === "ok" && (
          <div className="rounded-xl border border-emerald-300/50 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 text-sm">
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">Email enviado com sucesso</p>
              {result.id && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  ID Resend: <Badge variant="outline" className="font-mono text-[10px]">{result.id}</Badge>
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Verifique a caixa de entrada (e a pasta de spam) em <strong>{to}</strong>.
              </p>
            </div>
          </div>
        )}

        {result?.status === "error" && (
          <div className="rounded-xl border border-rose-300/50 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 text-sm">
              <p className="font-semibold text-rose-700 dark:text-rose-400">Falha no envio</p>
              <p className="text-xs text-foreground mt-1">{result.message}</p>
              {result.detail !== undefined && (
                <pre className="text-[10px] text-muted-foreground mt-2 bg-muted/40 rounded p-2 overflow-x-auto max-h-32">
                  {typeof result.detail === "string" ? result.detail : JSON.stringify(result.detail, null, 2)}
                </pre>
              )}
              <p className="text-[11px] text-muted-foreground mt-2">
                Cheque: 1) <code>RESEND_API_KEY</code> nas Secrets do Supabase, 2) domínio <code>novareapp.com.br</code> verificado no Resend, 3) deploy mais recente da função <code>send-client-email</code>.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
