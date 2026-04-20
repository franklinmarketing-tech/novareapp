import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Lock, Moon, Sun } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SEO } from "@/components/SEO";

const ClientSettings = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, email").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) { setFullName(data.full_name); setEmail(data.email); } });
  }, [user]);

  const initials = fullName ? fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() : "C";

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("user_id", user.id);
    setSaving(false);
    toast(error ? { title: "Erro", description: "Não foi possível salvar.", variant: "destructive" as const } : { title: "Perfil atualizado" });
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" }); return; }
    if (newPassword.length < 6) { toast({ title: "Erro", description: "Mínimo 6 caracteres.", variant: "destructive" }); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Senha alterada" }); setNewPassword(""); setConfirmPassword(""); }
  };

  return (
    <PageTransition className="space-y-8">
      <SEO title="Configurações" description="Atualize seu perfil, senha e preferências de tema na Novare." index={false} />
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie seu perfil e preferências</p>
      </div>

      {/* Profile */}
      <Card className="rounded-2xl border-border/40 shadow-subtle">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-primary">{initials}</span>
            </div>
            <div>
              <p className="font-semibold text-foreground">{fullName || "Cliente"}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome completo</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</Label>
              <Input id="email" value={email} disabled className="opacity-50 rounded-xl h-11" />
            </div>
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} className="rounded-full px-6">
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="rounded-2xl border-border/40 shadow-subtle">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/8 flex items-center justify-center">
              <Lock className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Segurança</p>
              <p className="text-xs text-muted-foreground">Altere sua senha de acesso</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nova senha</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirmar</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="rounded-xl h-11" />
            </div>
          </div>
          <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword} variant="outline" className="rounded-full px-6">
            {changingPassword ? "Alterando..." : "Alterar senha"}
          </Button>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card className="rounded-2xl border-border/40 shadow-subtle">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/8 flex items-center justify-center">
                {isDark ? <Moon className="h-6 w-6 text-accent" /> : <Sun className="h-6 w-6 text-accent" />}
              </div>
              <div>
                <p className="font-semibold text-foreground">Tema</p>
                <p className="text-xs text-muted-foreground">Alterne entre claro e escuro</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>
    </PageTransition>
  );
};

export default ClientSettings;
