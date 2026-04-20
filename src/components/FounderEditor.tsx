import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  X, Plus, Trash2, Loader2, Upload, GripVertical,
  Briefcase, TrendingUp, GraduationCap, Shield, Users, Award,
  Linkedin, Star, Heart, Target, Zap, Trophy, BookOpen,
} from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import type { Founder, FounderHighlight } from "@/lib/founders";

export const ICON_OPTIONS = {
  Briefcase, TrendingUp, GraduationCap, Shield, Users, Award,
  Star, Heart, Target, Zap, Trophy, BookOpen, Linkedin,
} as const;

export type IconName = keyof typeof ICON_OPTIONS;

const founderSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres").max(100),
  short_name: z.string().trim().min(1, "Obrigatório").max(40),
  certs: z.string().trim().max(120),
  role: z.string().trim().max(80),
  short_bio: z.string().trim().max(160),
  bio: z.string().trim().max(800),
  linkedin_url: z.string().trim().url("URL inválida").max(300).or(z.literal("")),
});

interface Props {
  founder: Founder | null; // null = criar novo
  onClose: () => void;
  onSaved: () => void;
}

export const FounderEditor = ({ founder, onClose, onSaved }: Props) => {
  const isNew = !founder;
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: founder?.name ?? "",
    short_name: founder?.short_name ?? "",
    certs: founder?.certs ?? "",
    role: founder?.role ?? "Sócio-fundador",
    short_bio: founder?.short_bio ?? "",
    bio: founder?.bio ?? "",
    image_url: founder?.image_url ?? "",
    linkedin_url: founder?.linkedin_url ?? "",
    display_order: founder?.display_order ?? 0,
    active: founder?.active ?? true,
  });
  const [highlights, setHighlights] = useState<FounderHighlight[]>(
    founder?.highlights ?? []
  );

  const update = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const addHighlight = () =>
    setHighlights((h) => [...h, { icon: "Star", text: "" }]);
  const updateHighlight = (i: number, patch: Partial<FounderHighlight>) =>
    setHighlights((h) => h.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const removeHighlight = (i: number) =>
    setHighlights((h) => h.filter((_, idx) => idx !== i));

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Selecione uma imagem.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Máx 5MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("founders").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("founders").getPublicUrl(path);
      update("image_url", data.publicUrl);
      toast({ title: "Foto enviada" });
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const parsed = founderSchema.safeParse(form);
    if (!parsed.success) {
      toast({
        title: "Verifique os campos",
        description: parsed.error.issues[0]?.message,
        variant: "destructive",
      });
      return;
    }
    const cleanHighlights = highlights
      .map((h) => ({ icon: h.icon, text: h.text.trim() }))
      .filter((h) => h.text.length > 0);

    setSaving(true);
    try {
      const payload = {
        ...form,
        highlights: cleanHighlights as any,
      };
      if (isNew) {
        const slug = form.short_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
          + "-" + Math.random().toString(36).slice(2, 6);
        const { error } = await supabase.from("founders").insert({ slug, ...payload });
        if (error) throw error;
        toast({ title: "Sócio criado" });
      } else {
        const { error } = await supabase.from("founders").update(payload).eq("id", founder!.id);
        if (error) throw error;
        toast({ title: "Salvo com sucesso" });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!founder) return;
    if (!confirm(`Remover ${founder.name}? Esta ação não pode ser desfeita.`)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("founders").delete().eq("id", founder.id);
      if (error) throw error;
      toast({ title: "Sócio removido" });
      onSaved();
      onClose();
    } catch (e: any) {
      toast({ title: "Erro ao remover", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-primary/70 backdrop-blur-md" onClick={onClose} />
      <motion.div
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background rounded-3xl shadow-2xl border border-border/40 p-6 space-y-5"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{isNew ? "Novo sócio-fundador" : "Editar sócio"}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Foto */}
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-muted ring-2 ring-border flex-shrink-0">
            {form.image_url ? (
              <img src={form.image_url} alt="" className="w-full h-full object-cover object-top" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                Sem foto
              </div>
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Enviar foto
            </Button>
            <p className="text-xs text-muted-foreground">JPG/PNG até 5MB</p>
          </div>
        </div>

        {/* Dados básicos */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Nome completo</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} maxLength={100} />
          </div>
          <div>
            <Label>Nome curto</Label>
            <Input value={form.short_name} onChange={(e) => update("short_name", e.target.value)} maxLength={40} />
          </div>
          <div>
            <Label>Certificações</Label>
            <Input
              value={form.certs}
              onChange={(e) => update("certs", e.target.value)}
              placeholder="CEA · CNEP-I"
              maxLength={120}
            />
          </div>
          <div>
            <Label>Cargo</Label>
            <Input value={form.role} onChange={(e) => update("role", e.target.value)} maxLength={80} />
          </div>
          <div>
            <Label>Bio curta</Label>
            <Input
              value={form.short_bio}
              onChange={(e) => update("short_bio", e.target.value)}
              placeholder="Consultor Wealth"
              maxLength={160}
            />
          </div>
          <div className="col-span-2">
            <Label>Descrição completa</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              rows={3}
              maxLength={800}
            />
          </div>
          <div className="col-span-2">
            <Label>LinkedIn</Label>
            <Input
              value={form.linkedin_url}
              onChange={(e) => update("linkedin_url", e.target.value)}
              placeholder="https://www.linkedin.com/in/..."
            />
          </div>
          <div>
            <Label>Ordem de exibição</Label>
            <Input
              type="number"
              value={form.display_order}
              onChange={(e) => update("display_order", parseInt(e.target.value || "0"))}
            />
          </div>
          <div className="flex items-end gap-2">
            <Switch checked={form.active} onCheckedChange={(v) => update("active", v)} />
            <Label className="mb-1.5">Ativo (visível)</Label>
          </div>
        </div>

        {/* Destaques */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Destaques</Label>
            <Button type="button" size="sm" variant="outline" onClick={addHighlight}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar
            </Button>
          </div>
          <div className="space-y-2">
            {highlights.map((h, i) => {
              const Icon = ICON_OPTIONS[h.icon as IconName] ?? Star;
              return (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                  <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <Select value={h.icon} onValueChange={(v) => updateHighlight(i, { icon: v })}>
                    <SelectTrigger className="w-32 flex-shrink-0">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span className="text-xs">{h.icon}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ICON_OPTIONS) as IconName[]).map((name) => {
                        const I = ICON_OPTIONS[name];
                        return (
                          <SelectItem key={name} value={name}>
                            <div className="flex items-center gap-2">
                              <I className="w-4 h-4" />
                              <span>{name}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Input
                    value={h.text}
                    onChange={(e) => updateHighlight(i, { text: e.target.value })}
                    placeholder="Conquista ou destaque"
                    maxLength={200}
                  />
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeHighlight(i)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
            {highlights.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Nenhum destaque adicionado.</p>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          {!isNew ? (
            <Button variant="ghost" onClick={handleDelete} disabled={saving} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" /> Remover
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
