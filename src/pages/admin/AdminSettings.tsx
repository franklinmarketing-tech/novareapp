import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  User, Lock, Palette, Settings, Moon, Sun,
  Users, Image as ImageIcon, Bell, CreditCard, Loader2, Upload, Plus, Pencil,
} from "lucide-react";
import PageBanner from "@/components/PageBanner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SEO } from "@/components/SEO";
import { useSettingsCompletion, type SettingsTabId } from "@/hooks/useSettingsCompletion";
import { fetchFounders, type Founder } from "@/lib/founders";
import { FounderEditor } from "@/components/FounderEditor";
import { BrandSettings } from "@/components/admin/BrandSettings";

const TABS: { id: SettingsTabId; label: string; icon: typeof User }[] = [
  { id: "perfil", label: "Perfil", icon: User },
  { id: "equipe", label: "Equipe", icon: Users },
  { id: "marca", label: "Marca", icon: ImageIcon },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "cobranca", label: "Cobrança", icon: CreditCard },
  { id: "seguranca", label: "Segurança", icon: Lock },
];

const PendingDot = ({ show }: { show: boolean }) =>
  show ? (
    <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-destructive shrink-0" aria-label="Pendente" />
  ) : null;

const AdminSettings = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const completion = useSettingsCompletion();
  const isDark = theme === "dark";

  const initialTab = (searchParams.get("tab") as SettingsTabId) || "perfil";
  const [activeTab, setActiveTab] = useState<SettingsTabId>(
    TABS.some((t) => t.id === initialTab) ? initialTab : "perfil"
  );

  useEffect(() => {
    const t = (searchParams.get("tab") as SettingsTabId) || "perfil";
    if (TABS.some((tab) => tab.id === t) && t !== activeTab) setActiveTab(t);
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as SettingsTabId);
    const next = new URLSearchParams(searchParams);
    next.set("tab", value);
    setSearchParams(next, { replace: true });
  };

  // ── Profile state ────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  // ── Security state ───────────────────────────────
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // ── Notifications (local only for now) ───────────
  const [notifEmailWeekly, setNotifEmailWeekly] = useState(true);
  const [notifNewClient, setNotifNewClient] = useState(true);
  const [notifBirthdays, setNotifBirthdays] = useState(true);

  // ── Team (founders) ──────────────────────────────
  const [founders, setFounders] = useState<Founder[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingFounder, setEditingFounder] = useState<Founder | null>(null);

  const reloadFounders = () =>
    fetchFounders(true).then(setFounders).catch(() => setFounders([]));

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name || "");
          setEmail(data.email || "");
        }
      });
  }, [user]);

  useEffect(() => {
    fetchFounders(true).then(setFounders).catch(() => setFounders([]));
  }, []);

  const initials = useMemo(
    () =>
      fullName
        ? fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
        : "A",
    [fullName]
  );

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("user_id", user.id);
    setSavingProfile(false);
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

  return (
    <div>
      <SEO title="Configurações" description="Gerencie seu perfil, equipe, marca e preferências da Novare." index={false} />
      <PageBanner
        title="Configurações"
        description={
          completion.pendingCount > 0
            ? `${completion.pendingCount} ${completion.pendingCount === 1 ? "item pendente" : "itens pendentes"} de configuração`
            : "Tudo configurado"
        }
        icon={Settings}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto h-auto flex-wrap">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const pending = completion[tab.id];
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                <PendingDot show={!completion.loading && pending} />
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ── PERFIL ─────────────────────────────────── */}
        <TabsContent value="perfil" className="mt-6 space-y-6">
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

              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? "Salvando..." : "Salvar alterações"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Palette className="h-6 w-6 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">Aparência</CardTitle>
                  <CardDescription>Tema da interface.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isDark ? <Moon className="h-6 w-6 text-accent" /> : <Sun className="h-6 w-6 text-accent" />}
                  <div>
                    <p className="text-sm font-medium text-foreground">Tema</p>
                    <p className="text-xs text-muted-foreground">Alterne entre o tema claro e escuro</p>
                  </div>
                </div>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── EQUIPE ─────────────────────────────────── */}
        <TabsContent value="equipe" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-lg">Sócios e consultores</CardTitle>
                    <CardDescription>
                      Quem aparece para os clientes na barra "Seus consultores".
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="rounded-full">
                  {founders.filter((f) => f.active).length} ativos
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {founders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhum sócio cadastrado ainda.
                </p>
              ) : (
                founders.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted shrink-0 overflow-hidden">
                      {f.image_url ? (
                        <img src={f.image_url} alt={f.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
                          {f.short_name?.charAt(0) || "?"}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{f.role}</p>
                    </div>
                    {f.active ? (
                      <Badge className="bg-success/10 text-success border-success/20 rounded-full">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="rounded-full">Inativo</Badge>
                    )}
                  </div>
                ))
              )}
              <p className="text-xs text-muted-foreground pt-2">
                Para editar nome, foto e bio dos sócios, use o editor visual no rodapé do menu lateral.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── MARCA ──────────────────────────────────── */}
        <TabsContent value="marca" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">Identidade visual</CardTitle>
                  <CardDescription>
                    Logo, cores e conteúdo público da Novare.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/60 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Logo principal</p>
                  <p className="text-sm font-medium text-foreground">logo-branca.png</p>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Definida no código (src/assets/logo-branca.png).
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Domínio público</p>
                  <a
                    href="https://novareapp.com.br"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
                  >
                    novareapp.com.br <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <div className="rounded-xl border border-border/60 p-4">
                <p className="text-sm font-medium text-foreground mb-1">Fotos dos sócios</p>
                <p className="text-xs text-muted-foreground">
                  {founders.filter((f) => f.image_url).length} de {founders.length} sócios com foto carregada.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => handleTabChange("equipe")}
                >
                  Gerenciar equipe
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── NOTIFICAÇÕES ───────────────────────────── */}
        <TabsContent value="notificacoes" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Bell className="h-6 w-6 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">Notificações por e-mail</CardTitle>
                  <CardDescription>
                    Escolha quais alertas receber. (em breve — preferências locais)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <NotifRow
                label="Resumo semanal da consultoria"
                description="Toda segunda-feira pela manhã."
                checked={notifEmailWeekly}
                onChange={setNotifEmailWeekly}
              />
              <NotifRow
                label="Novo cliente cadastrado"
                description="Avisar quando alguém criar conta pelo signup público."
                checked={notifNewClient}
                onChange={setNotifNewClient}
              />
              <NotifRow
                label="Aniversários de clientes"
                description="Lembrete na manhã do aniversário."
                checked={notifBirthdays}
                onChange={setNotifBirthdays}
              />
              <p className="text-[11px] text-muted-foreground pt-2">
                ⚠ Estas preferências ainda não são persistidas — em breve.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── COBRANÇA ───────────────────────────────── */}
        <TabsContent value="cobranca" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">Plano e cobrança</CardTitle>
                  <CardDescription>Gerencie seu plano e pagamentos.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/60 p-5 bg-muted/20">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Plano atual
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-1">Novare Pro</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Faturamento e gestão de assinaturas serão integrados em breve.
                    </p>
                  </div>
                  <Badge className="bg-success/10 text-success border-success/20 rounded-full">
                    Ativo
                  </Badge>
                </div>
              </div>
              <Button variant="outline" disabled>
                Atualizar método de pagamento (em breve)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SEGURANÇA ──────────────────────────────── */}
        <TabsContent value="seguranca" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Lock className="h-6 w-6 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">Senha</CardTitle>
                  <CardDescription>Altere sua senha de acesso.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword}>
                {changingPassword ? "Alterando..." : "Alterar senha"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const NotifRow = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export default AdminSettings;
