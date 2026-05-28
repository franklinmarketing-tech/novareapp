import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const COOKIE_NAME = "novare_cookies_consent";
const COOKIE_DAYS = 365;

const setCookie = (name: string, value: string, days: number) => {
  if (typeof document === "undefined") return;
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value}; ${expires}; path=/; SameSite=Lax`;
};

const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null;
  return null;
};

export const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Atraso curto para nao competir com o splash/preloader inicial
    const t = setTimeout(() => {
      if (!getCookie(COOKIE_NAME)) setVisible(true);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  const accept = () => {
    setCookie(COOKIE_NAME, "accepted", COOKIE_DAYS);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-2xl rounded-2xl border border-border bg-background/95 backdrop-blur-md shadow-xl p-4 sm:p-5 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <button
        type="button"
        onClick={accept}
        aria-label="Fechar"
        className="absolute top-2 right-2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
        <div className="shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Cookie className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground leading-relaxed">
            Usamos cookies essenciais para autenticação e preferências. Ao continuar você
            concorda. Saiba mais na
            {" "}
            <Link to="/privacidade" className="text-primary underline hover:no-underline">
              Política de Privacidade
            </Link>
            .
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={accept} className="h-8">
              Aceitar
            </Button>
            <Button asChild size="sm" variant="outline" className="h-8">
              <Link to="/privacidade">Saber mais</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
