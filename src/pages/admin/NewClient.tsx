import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { UserPlus, ArrowRight, RefreshCw, Eye, EyeOff, ClipboardList, UserCircle2, Mail, Copy, Check } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function generatePassword(): string {
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = lower + upper + digits + symbols;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let pwd = pick(lower) + pick(upper) + pick(digits) + pick(symbols);
  for (let i = 0; i < 8; i++) pwd += pick(all);
  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

const NewClient = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(() => generatePassword());
  const [showPassword, setShowPassword] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Estado do diálogo pós-cadastro
  const [postCreate, setPostCreate] = useState<{
    open: boolean;
    slug: string | null;
    email: string;
    password: string;
    name: string;
  }>({ open: false, slug: null, email: "", password: "", name: "" });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Senha muito curta", description: "Use pelo menos 8 caracteres.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-client", {
        body: { name, email, password },
      });

      if (error) throw new Error(error.message || "Erro ao criar cliente");
      if (data?.error) throw new Error(data.error);

      const slug = data?.slug;
      const clientId = data?.clientId;
      toast({
        title: data?.alreadyExisted ? "Cliente já existia" : "Cliente cadastrado!",
        description: data?.alreadyExisted
          ? `Senha redefinida e e-mail reenviado para ${email}.`
          : `E-mail com credenciais enviado para ${email}.`,
      });

      let finalSlug = slug;
      if (!finalSlug && clientId) {
        const { data: client } = await supabase.from("clients").select("slug").eq("id", clientId).maybeSingle();
        finalSlug = client?.slug;
      }

      // Abre diálogo com as opções de onboarding
      setPostCreate({
        open: true,
        slug: finalSlug ?? null,
        email,
        password,
        name,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar cliente",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition className="flex items-center justify-center min-h-[80vh]">
      <SEO title="Novo cliente" description="Cadastre um novo cliente para iniciar o onboarding na Novare." index={false} />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-[420px] mx-auto text-center space-y-10"
      >
        {/* Hero icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center shadow-[0_0_30px_hsl(var(--accent)/0.15)]">
            <UserPlus className="h-7 w-7 text-accent" />
          </div>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-[1.625rem] font-display font-semibold tracking-[-0.02em] text-foreground leading-[1.15]">
            Novo cliente
          </h1>
          <p className="text-[0.875rem] text-muted-foreground font-light">
            Defina uma senha inicial. Ela será enviada por e-mail e o cliente poderá trocá-la depois nas Configurações.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">Nome completo</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do cliente"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@cliente.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">Senha inicial</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  required
                  className="font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setPassword(generatePassword())}
                title="Gerar nova senha"
                className="shrink-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              A senha será incluída no e-mail de boas-vindas. O cliente pode trocá-la depois.
            </p>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            variant="premium"
            className="w-full mt-2 rounded-2xl"
            size="lg"
          >
            {isLoading ? "Cadastrando..." : "Cadastrar e Iniciar Onboarding"}
            {!isLoading && (
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent-foreground/20 ml-1">
                <ArrowRight className="h-6 w-6" />
              </span>
            )}
          </Button>
        </form>
      </motion.div>
    </PageTransition>
  );
};

export default NewClient;
