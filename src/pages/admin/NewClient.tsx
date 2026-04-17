import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { UserPlus, ArrowRight } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";

const NewClient = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-client", {
        body: { name, email },
      });

      if (error) throw new Error(error.message || "Erro ao criar cliente");
      if (data?.error) throw new Error(data.error);

      const clientId = data?.clientId;
      toast({
        title: data?.alreadyExisted ? "Cliente já existia" : "Cliente cadastrado!",
        description: data?.alreadyExisted
          ? `Continuando o onboarding de ${email}.`
          : `Credenciais de acesso enviadas para ${email}.`,
      });
      if (clientId) {
        const { data: client } = await supabase.from("clients").select("slug").eq("id", clientId).maybeSingle();
        navigate(client?.slug ? `/admin/cliente/${client.slug}/onboarding` : "/admin/clientes");
      } else {
        navigate("/admin/clientes");
      }
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
            O cliente receberá email com login e senha temporária para acessar a plataforma.
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
