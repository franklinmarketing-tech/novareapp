import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { SEO } from "@/components/SEO";

type State =
  | { kind: "loading" }
  | { kind: "invalid"; message: string }
  | { kind: "ready"; email: string; role: "admin" | "super_admin" }
  | { kind: "submitting"; email: string; role: "admin" | "super_admin" }
  | { kind: "success" };

const AcceptInvite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!token) {
        setState({ kind: "invalid", message: "Token ausente." });
        return;
      }
      const cleanToken = token.trim();
      const { data, error } = await supabase.functions.invoke("accept-admin-invite", {
        body: { action: "validate", token: cleanToken },
      });
      if (cancelled) return;
      // Tenta extrair mensagem real do erro (FunctionsHttpError tem context.json())
      let realError: string | null = (data as any)?.error ?? null;
      if (error && !realError) {
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            realError = body?.error ?? null;
          } else if (ctx && typeof ctx.text === "function") {
            const txt = await ctx.text();
            try { realError = JSON.parse(txt)?.error ?? txt; } catch { realError = txt; }
          }
        } catch { /* ignore */ }
        if (!realError) realError = error.message;
      }
      if (realError) {
        setState({ kind: "invalid", message: realError });
        return;
      }
      setState({ kind: "ready", email: (data as any).email, role: (data as any).role });
    };
    run();
    return () => { cancelled = true; };
  }, [token]);

  const submit = async () => {
    if (state.kind !== "ready") return;
    if (fullName.trim().length < 2) {
      toast({ title: "Nome inválido", description: "Informe seu nome completo.", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Senha curta", description: "Mínimo de 8 caracteres.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Senhas diferentes", description: "Confirme a senha corretamente.", variant: "destructive" });
      return;
    }
    setState({ kind: "submitting", email: state.email, role: state.role });
    const { data, error } = await supabase.functions.invoke("accept-admin-invite", {
      body: { action: "accept", token: token?.trim(), full_name: fullName.trim(), password },
    });
    let realError: string | null = (data as any)?.error ?? null;
    if (error && !realError) {
      try {
        const ctx: any = (error as any).context;
        if (ctx && typeof ctx.json === "function") {
          const body = await ctx.json();
          realError = body?.error ?? null;
        } else if (ctx && typeof ctx.text === "function") {
          const txt = await ctx.text();
          try { realError = JSON.parse(txt)?.error ?? txt; } catch { realError = txt; }
        }
      } catch { /* ignore */ }
      if (!realError) realError = error.message;
    }
    if (realError) {
      toast({ title: "Erro", description: realError, variant: "destructive" });
      setState({ kind: "ready", email: state.email, role: state.role });
      return;
    }
    // Faz login automático
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: state.email,
      password,
    });
    if (signInErr) {
      toast({ title: "Conta criada", description: "Faça login para continuar." });
      navigate("/login", { replace: true });
      return;
    }
    setState({ kind: "success" });
    setTimeout(() => {
      navigate(state.role === "super_admin" ? "/super-admin" : "/admin", { replace: true });
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <SEO title="Aceitar convite · Novare" description="Aceite o convite para acessar a plataforma Novare." />
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Aceitar convite</CardTitle>
          <CardDescription>Complete os dados para criar sua conta de administrador.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.kind === "loading" && (
            <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Validando convite…</span>
            </div>
          )}

          {state.kind === "invalid" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Convite inválido</p>
                  <p className="text-muted-foreground mt-1">{state.message}</p>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Ir para login</Link>
              </Button>
            </div>
          )}

          {(state.kind === "ready" || state.kind === "submitting") && (
            <>
              <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{state.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Papel</span>
                  <Badge variant={state.role === "super_admin" ? "default" : "secondary"}>
                    {state.role === "super_admin" ? "Super Admin" : "Admin"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome"
                  disabled={state.kind === "submitting"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd">Senha</Label>
                <Input
                  id="pwd"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  disabled={state.kind === "submitting"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar senha</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repita a senha"
                  disabled={state.kind === "submitting"}
                />
              </div>
              <Button onClick={submit} className="w-full" disabled={state.kind === "submitting"}>
                {state.kind === "submitting" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar conta e entrar
              </Button>
            </>
          )}

          {state.kind === "success" && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <p className="font-medium">Conta criada com sucesso!</p>
              <p className="text-sm text-muted-foreground">Redirecionando…</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;
