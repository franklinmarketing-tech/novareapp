// Minha Marca: personalização (white-label) do consultor — logo, nome, empresa e WhatsApp.
// Aparece no card do consultor (Painel) e no relatório PDF. O logo é comprimido e salvo no plano.
import { useRef, useState } from "react";
import { useVidaPlan } from "../state/VidaPlanContext";
import { useConsultorPerfil } from "../state/ConsultorPerfil";
import type { Branding } from "@/lib/lifeplan";
import { VPCard, VPTitle } from "../components/ui";
import AdvisorCard from "../components/AdvisorCard";
import { Upload, Trash2, ImageIcon, Info, BadgeCheck, Loader2 } from "lucide-react";

const Marca = () => {
  const { input, setField } = useVidaPlan();
  const { codigo, salvarCodigo } = useConsultorPerfil();
  const b = input.branding ?? {};
  const fileRef = useRef<HTMLInputElement>(null);
  const upd = (patch: Partial<Branding>) => setField("branding", { ...b, ...patch });

  const [cod, setCod] = useState("");
  const [savingCod, setSavingCod] = useState(false);
  const [codMsg, setCodMsg] = useState<string | null>(null);
  const salvarCod = async () => {
    setSavingCod(true); setCodMsg(null);
    const r = await salvarCodigo(cod, b.consultor, b.empresa);
    setCodMsg(r.ok ? "Pronto! Você é consultor — o Painel do Consultor já está no seu menu." : (r.erro ?? "Erro ao salvar."));
    if (r.ok) setCod("");
    setSavingCod(false);
  };

  const onFile = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 380;
        const scale = Math.min(1, maxW / img.naturalWidth);
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        upd({ logo: canvas.toDataURL("image/png"), logoRatio: w / h });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <VPTitle hint="Sua marca no app e no relatório PDF — para apresentar ao cliente como sua.">🎨 Minha Marca</VPTitle>

      <VPCard className="p-5 space-y-5">
        {/* Logo */}
        <div>
          <p className="text-xs font-semibold text-[#1b2a3d]/70 mb-2">Logo da marca</p>
          <div className="flex items-center gap-4">
            <div className="h-20 w-40 rounded-xl border border-black/10 flex items-center justify-center overflow-hidden shrink-0"
              style={{ backgroundImage: "linear-gradient(45deg,#eee 25%,transparent 25%),linear-gradient(-45deg,#eee 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eee 75%),linear-gradient(-45deg,transparent 75%,#eee 75%)", backgroundSize: "14px 14px", backgroundPosition: "0 0,0 7px,7px -7px,-7px 0" }}>
              {b.logo
                ? <img src={b.logo} alt="Logo" className="max-h-full max-w-full object-contain" />
                : <ImageIcon className="h-7 w-7 text-[#1b2a3d]/25" />}
            </div>
            <div className="space-y-2">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden"
                onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
              <button onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#16314f] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1d3e63] transition-colors">
                <Upload className="h-4 w-4" /> {b.logo ? "Trocar imagem" : "Enviar logo"}
              </button>
              {b.logo && (
                <button onClick={() => upd({ logo: undefined, logoRatio: undefined })}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#C8643F]/40 px-3 py-2 text-sm font-semibold text-[#C8643F] hover:bg-[#C8643F]/[0.06] transition-colors ml-2">
                  <Trash2 className="h-4 w-4" /> Remover
                </button>
              )}
            </div>
          </div>
          <p className="text-[11px] text-[#1b2a3d]/45 mt-2">
            Use um logo nítido, na horizontal e sem bordas. PNG com fundo transparente fica melhor.
          </p>
        </div>

        {/* Dados */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nome do consultor" value={b.consultor ?? ""} placeholder="Ex.: Daniel Arruda"
            onChange={(v) => upd({ consultor: v })} />
          <Field label="Empresa" value={b.empresa ?? ""} placeholder="Ex.: Novare Consultoria"
            onChange={(v) => upd({ empresa: v })} />
          <Field label="WhatsApp" value={b.telefone ?? ""} placeholder="(19) 98340-2827"
            onChange={(v) => upd({ telefone: v })} />
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-[#16314f]/[0.04] px-4 py-3">
          <Info className="h-4 w-4 text-[#16314f] mt-0.5 shrink-0" />
          <p className="text-xs text-[#1b2a3d]/60">
            Sua marca aparece automaticamente no <strong className="text-[#16314f]">card do consultor</strong> (no Painel) e no
            <strong className="text-[#16314f]"> relatório PDF</strong> do cliente. As alterações salvam sozinhas.
          </p>
        </div>
      </VPCard>

      {/* Sou consultor — código de vínculo */}
      <VPCard className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <BadgeCheck className="h-5 w-5 text-[#2F8F6B]" />
          <p className="font-display text-lg font-bold text-[#16314f]">Sou consultor</p>
        </div>
        <p className="text-sm text-[#1b2a3d]/55 mb-3">Crie um código único para seus clientes te vincularem. Isso libera o <strong className="text-[#16314f]">Painel do Consultor</strong> no seu menu e faz seus clientes aparecerem lá.</p>
        {codigo && (
          <p className="text-sm text-[#16314f] mb-2">Seu código atual: <span className="font-mono font-bold tracking-wide bg-[#16314f]/[0.06] rounded px-2 py-0.5">{codigo}</span></p>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={cod} onChange={(e) => setCod(e.target.value.toUpperCase())} placeholder={codigo ?? "Ex.: NOVARE2026"}
            className="flex-1 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-mono tracking-wide text-[#16314f] outline-none focus:border-[#C8643F] placeholder:font-sans placeholder:tracking-normal placeholder:text-[#1b2a3d]/30" />
          <button onClick={salvarCod} disabled={savingCod || cod.trim().length < 3}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#16314f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d3e63] disabled:opacity-50 transition-colors">
            {savingCod && <Loader2 className="h-4 w-4 animate-spin" />} {codigo ? "Atualizar código" : "Virar consultor"}
          </button>
        </div>
        {codMsg && <p className="text-xs text-[#16314f] bg-[#2F8F6B]/[0.08] rounded-lg px-3 py-2 mt-2">{codMsg}</p>}
      </VPCard>

      {/* Pré-visualização ao vivo */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#1b2a3d]/50 mb-2">Pré-visualização</p>
        <AdvisorCard />
      </div>
    </div>
  );
};

const Field = ({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (v: string) => void }) => (
  <label className="block">
    <span className="text-xs font-semibold text-[#1b2a3d]/70">{label}</span>
    <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#16314f] outline-none focus:border-[#C8643F] placeholder:text-[#1b2a3d]/30" />
  </label>
);

export default Marca;
