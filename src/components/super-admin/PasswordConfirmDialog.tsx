import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  destructive?: boolean;
  requireReason?: boolean;
  requireConfirmText?: string; // ex: "DELETAR DEFINITIVO"
  confirmLabel?: string;
  onConfirm: (params: { password: string; reason: string; confirm_text: string }) => Promise<void>;
}

export const PasswordConfirmDialog = ({
  open, onOpenChange, title, description, destructive,
  requireReason, requireConfirmText, confirmLabel = "Confirmar",
  onConfirm,
}: Props) => {
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => { setPassword(""); setReason(""); setConfirmText(""); };

  const canSubmit =
    password.length >= 6 &&
    (!requireReason || reason.trim().length >= 5) &&
    (!requireConfirmText || confirmText === requireConfirmText);

  const handle = async () => {
    setLoading(true);
    try {
      await onConfirm({ password, reason, confirm_text: confirmText });
      reset();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center mb-2 ${destructive ? "bg-destructive/15" : "bg-primary/15"}`}>
            <ShieldAlert className={`h-6 w-6 ${destructive ? "text-destructive" : "text-primary"}`} />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {requireConfirmText && (
            <div className="space-y-1.5">
              <Label className="text-xs">
                Digite <span className="font-mono font-bold text-destructive">{requireConfirmText}</span> para confirmar
              </Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={requireConfirmText}
                autoComplete="off"
              />
            </div>
          )}
          {requireReason && (
            <div className="space-y-1.5">
              <Label className="text-xs">Motivo (registrado no log)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Ex: violação de termos, solicitação do cliente…"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Sua senha de super admin</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={handle}
            disabled={!canSubmit || loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
