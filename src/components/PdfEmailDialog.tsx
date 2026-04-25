import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, FileDown, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { generateRendimentoPDF } from "@/lib/generateRendimentoPDF";
import { supabase } from "@/integrations/supabase/client";

interface SimResultLite {
  patrimonio: string;
  patrimonioLiquido: string;
  rendaMensal: string;
  rendaMensalLiquida: string;
  rendaAnualLiquida: string;
  totalInvestido: string;
  ganhoLiquido: string;
  ganhoBruto: string;
  irDevido: string;
  atingeMeta: boolean;
  anosAcumulo: number;
  aliquotaIR: number;
  taxaMensalEfetiva: number;
  patrimonioNum: number;
  patrimonioLiquidoNum: number;
  totalInvestidoNum: number;
  rendaMensalLiquidaNum: number;
  rendaDesejadaNum: number;
  // deno-lint-ignore no-explicit-any
  timeline: any[];
}

interface SimInputLite {
  idadeAtual: number;
  idadeAposent: number;
  patrimonioAtual: number;
  aporte: number;
  rendaDesejada: number;
  rentabilidadeAnual: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: SimResultLite | null;
  input: SimInputLite | null;
}

const emailSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(254),
});

export function PdfEmailDialog({ open, onOpenChange, result, input }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result || !input) return;

    const parsed = emailSchema.safeParse({ email });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "E-mail inválido");
      return;
    }

    setLoading(true);
    try {
      // Gera PDF (download local + base64 para envio)
      const { base64, fileName } = await generateRendimentoPDF(result, input, { download: true });

      // Snapshot resumido para o admin
      const snapshot = {
        patrimonio: result.patrimonio,
        patrimonioLiquido: result.patrimonioLiquido,
        rendaMensal: result.rendaMensalLiquida,
        anosAcumulo: result.anosAcumulo,
        idadeAtual: input.idadeAtual,
        idadeAposent: input.idadeAposent,
        aporte: input.aporte,
        rendaDesejada: input.rendaDesejada,
        rentabilidadeAnual: input.rentabilidadeAnual,
        atingeMeta: result.atingeMeta,
        gerado_em: new Date().toISOString(),
      };

      const { data, error } = await supabase.functions.invoke("send-pdf-lead", {
        body: {
          email: parsed.data.email,
          pdfBase64: base64,
          filename: fileName,
          snapshot,
        },
      });

      if (error || (data as { error?: string })?.error) {
        const msg = (data as { error?: string })?.error || error?.message || "Falha ao enviar e-mail";
        toast.error(msg);
        // PDF já foi baixado; deixa o usuário fechar
      } else {
        toast.success("PDF enviado para o seu e-mail! ✉️", {
          description: "Verifique sua caixa de entrada (e a pasta de spam).",
        });
        setEmail("");
        onOpenChange(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar/enviar o PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-novare-blue dark:text-novare-blue-bright">
            <FileDown className="h-5 w-5" />
            Receba seu relatório por e-mail
          </DialogTitle>
          <DialogDescription>
            Informe seu e-mail para baixar agora e receber uma cópia em PDF na sua caixa de entrada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="pdf-email" className="text-sm font-medium">
              <Mail className="inline h-3.5 w-3.5 mr-1 align-text-bottom" />
              Seu melhor e-mail
            </Label>
            <Input
              id="pdf-email"
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="mt-1.5"
              required
            />
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <ShieldCheck className="h-4 w-4 text-novare-blue dark:text-novare-blue-bright shrink-0 mt-0.5" />
            <p>
              Seus dados estão seguros. Usaremos seu e-mail apenas para enviar este relatório e, se você quiser, agendar uma conversa com a Novare.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-novare-blue hover:bg-novare-blue/90 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando e enviando...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-2" />
                  Gerar e enviar PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
