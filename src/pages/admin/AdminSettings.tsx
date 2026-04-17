import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { User, Lock, Palette, Settings, Moon, Sun } from "lucide-react";
import PageBanner from "@/components/PageBanner";

const AdminSettings = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name);
          setEmail(data.email);
        }
      });
  }, [user]);

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "A";

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível salvar o perfil.", variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado", description: "Suas informações foram salvas." });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter no mínimo 6 caracteres.", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha alterada", description: "Sua senha foi atualizada com sucesso." });
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const toggleTheme = (checked: boolean) => {
    setIsDark(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <div>
      <PageBanner title="Configurações" description="Gerencie seu perfil e preferências" icon={Settings} />

      <div className="space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="h-6 w-6 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Perfil</CardTitle>
                <CardDescription>Suas informações pessoais.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <span className="text-xl font-display font-semibold text-accent">{initials}</span>
              </div>
              <div>
                <p className="font-medium text-foreground">{fullName || "Administrador"}</p>
                <p className="text-sm text-muted-foreground">{email}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} disabled className="opacity-60" />
              </div>
            </div>

            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Lock className="h-6 w-6 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Segurança</CardTitle>
                <CardDescription>Altere sua senha de acesso.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova senha</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword}>
              {changingPassword ? "Alterando..." : "Alterar senha"}
            </Button>
          </CardContent>
        </Card>

        {/* Preferences — Theme */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Palette className="h-6 w-6 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Preferências</CardTitle>
                <CardDescription>Personalize sua experiência.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isDark ? <Moon className="h-6 w-6 text-accent" /> : <Sun className="h-6 w-6 text-accent" />}
                <div>
                  <p className="text-sm font-medium text-foreground">Tema escuro</p>
                  <p className="text-xs text-muted-foreground">Alterne entre o tema claro e escuro</p>
                </div>
              </div>
              <Switch checked={isDark} onCheckedChange={toggleTheme} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
