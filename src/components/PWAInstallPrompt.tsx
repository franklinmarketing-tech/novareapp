import { useEffect, useMemo, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISSED_KEY = "novare-pwa-install-dismissed";

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  ("standalone" in window.navigator && Boolean(window.navigator.standalone));

export const PWAInstallPrompt = () => {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  const isIOS = useMemo(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(ua);
  }, []);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISSED_KEY) === "true") return;

    const showFallbackTimer = window.setTimeout(() => {
      if (isIOS) setVisible(true);
    }, 1600);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleInstalled = () => {
      setVisible(false);
      setInstallEvent(null);
      localStorage.setItem(DISMISSED_KEY, "true");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.clearTimeout(showFallbackTimer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [isIOS]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") dismiss();
    setInstallEvent(null);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md sm:inset-x-auto sm:right-4 sm:bottom-4">
      <div className="rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-elevated">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Smartphone className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold leading-tight text-foreground">Instale o Novare</p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">
                  Acesse mais rápido, em tela cheia e com experiência otimizada no celular.
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={dismiss} aria-label="Fechar">
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            {installEvent ? (
              <Button className="mt-3 h-9 w-full gap-2" onClick={install}>
                <Download className="h-4 w-4" aria-hidden="true" />
                Instalar aplicativo
              </Button>
            ) : (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-xs leading-snug text-muted-foreground">
                <Share className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden="true" />
                <span>Abra o menu de compartilhamento do Safari e toque em “Adicionar à Tela de Início”.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;