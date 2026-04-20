import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { SEO } from "@/components/SEO";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const funnyMessages = [
    "Parece que essa página tirou férias… sem avisar. 🏖️",
    "Até nós, consultores financeiros, nos perdemos às vezes. 🧭",
    "Esse link não rendeu como esperávamos. 📉",
    "Investimento em URL errada = retorno zero. 😅",
  ];
  const message = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];

  return (
    <PageTransition className="flex min-h-screen items-center justify-center bg-background px-6">
      <SEO title="Página não encontrada" description="A página que você procura não existe ou foi movida." index={false} />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="text-center max-w-md"
      >
        <motion.p
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-[7rem] font-display font-bold text-foreground/10 leading-none select-none"
        >
          404
        </motion.p>
        <h1 className="text-xl font-semibold text-foreground tracking-tight -mt-4">
          Página não encontrada
        </h1>
        <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
          {message}
        </p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <Button variant="outline" onClick={() => navigate(-1)} className="rounded-xl gap-2">
            <ArrowLeft className="h-6 w-6" /> Voltar
          </Button>
          <Button onClick={() => navigate("/")} className="rounded-xl gap-2">
            <Home className="h-6 w-6" /> Ir ao início
          </Button>
        </div>
      </motion.div>
    </PageTransition>
  );
};

export default NotFound;
