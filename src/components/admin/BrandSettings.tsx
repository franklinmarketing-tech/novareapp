import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, Trash2, Sparkles, ExternalLink } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useAppSettings } from "@/hooks/useAppSettings";

const schema = z.object({
  company_name: z.string().trim().min(1, "Obrigatório").max(80),
  brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida (use #RRGGBB)"),
  support_email: z.string().trim().email("Email inválido").max(120).or(z.literal("")),
  website_url: z.string().trim().url("URL inválida").max(200).or(z.literal("")),
});

export const BrandSettings = () => {
  const { settings, loading, reload } = useAppSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    company_name: "Novare",
    brand_color: "#0F172A",
    support_email: "",
    website_url: "",
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    setForm({
      company_name: settings.company_name,
      brand_color: settings.brand_color,
      support_email: settings.support_email ?? "",
      website_url: settings.website_url ?? "",
    });
    setLogoUrl(settings.logo_url);
  }, [loading, settings]);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Selecione uma imagem.", variant: "destructive" });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Máx 3MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("brand")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("brand").getPublicUrl(path);
      setLogoUrl(data.publicUrl);
      toast({ title: "Logo enviada — clique em Salvar para confirmar." });
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({
        title: "Verifique os campos",
        description: parsed.error.issues[0]?.message,
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .update({
        company_name: form.company_name.trim(),
        brand_color: form.brand_color,
        support_email: form.support_email || null,
        website_url: form.website_url || null,
        logo_url: logoUrl,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Marca atualizada" });
      reload();
    }
  };

  const removeLogo = () => setLogoUrl(null);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-muted-foreground" />
          <div>
            <CardTitle className="text-lg">Identidade visual</CardTitle>
            <CardDescription>Logo, cores e dados públicos da empresa.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <div
            className="w-24 h-24 rounded-2xl border border-border/60 bg-muted/40 flex items-center justify-center overflow-hidden shrink-0"
            style={{ backgroundColor: form.brand_color }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <span className="text-xs text-background/70">Sem logo</span>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <Label>Logo (transparente, recomendado PNG)</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
            <div className="flex gap-2 flex-wrap">
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Enviar logo
              </Button>
              {logoUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={removeLogo} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-1" /> Remover
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">PNG/SVG até 3MB. Aparece no fundo da cor de marca.</p>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="company_name">Nome da empresa</Label>
            <Input
              id="company_name"
              value={form.company_name}
              onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand_color">Cor da marca</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={form.brand_color}
                onChange={(e) => setForm((f) => ({ ...f, brand_color: e.target.value }))}
                className="h-11 w-14 rounded-xl border border-border bg-card cursor-pointer"
              />
              <Input
                id="brand_color"
                value={form.brand_color}
                onChange={(e) => setForm((f) => ({ ...f, brand_color: e.target.value }))}
                placeholder="#0F172A"
                maxLength={7}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="support_email">E-mail de suporte</Label>
            <Input
              id="support_email"
              type="email"
              value={form.support_email}
              onChange={(e) => setForm((f) => ({ ...f, support_email: e.target.value }))}
              placeholder="contato@novareapp.com.br"
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website_url">Website público</Label>
            <Input
              id="website_url"
              value={form.website_url}
              onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))}
              placeholder="https://novareapp.com.br"
              maxLength={200}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {form.website_url ? (
            <a
              href={form.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              Abrir site <ExternalLink className="h-3 w-3" />
            </a>
          ) : <span />}
          <Button onClick={save} disabled={saving || loading}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar marca
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
