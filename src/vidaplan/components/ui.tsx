// Blocos visuais do Vida Plan (cartão, título de seção, KPI, barra de progresso).
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";

export const VPCard = ({ className, children, style }: { className?: string; children: ReactNode; style?: CSSProperties }) => (
  <div style={style} className={cn("rounded-2xl bg-white border border-black/5 shadow-[0_1px_3px_rgba(16,42,67,0.06)]", className)}>{children}</div>
);

export const VPTitle = ({ children, hint }: { children: ReactNode; hint?: string }) => (
  <div className="mb-4">
    <h1 className="font-display text-2xl font-bold text-[#16314f]">{children}</h1>
    {hint && <p className="text-sm text-[#1b2a3d]/60 mt-1">{hint}</p>}
  </div>
);

export const VPStat = ({ label, value, accent }: { label: string; value: string; accent?: "navy" | "terracota" | "green" }) => (
  <VPCard className="p-4">
    <p className="text-[10px] font-bold uppercase tracking-wider text-[#1b2a3d]/50">{label}</p>
    <p className={cn(
      "font-display text-xl font-bold mt-1 tabular-nums",
      accent === "terracota" ? "text-[#C8643F]" : accent === "green" ? "text-[#2F8F6B]" : "text-[#16314f]",
    )}>{value}</p>
  </VPCard>
);

export const VPProgress = ({ pct, tone = "navy" }: { pct: number; tone?: "navy" | "green" | "terracota" }) => (
  <div className="h-2.5 rounded-full bg-black/[0.06] overflow-hidden">
    <div
      className={cn("h-full rounded-full transition-all", tone === "green" ? "bg-[#2F8F6B]" : tone === "terracota" ? "bg-[#C8643F]" : "bg-[#16314f]")}
      style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
    />
  </div>
);

export const VPField = ({ label, suffix, value, onChange, step = 1 }: {
  label: string; suffix?: string; value: number; onChange: (v: number) => void; step?: number;
}) => {
  // Estado local em string: permite apagar o campo e digitar do zero sem "grudar" no 0.
  const [raw, setRaw] = useState(value === 0 ? "" : String(value));
  const editando = useRef(false);
  useEffect(() => {
    if (!editando.current) setRaw(value === 0 ? "" : String(value));
  }, [value]);

  return (
    <label className="block">
      <span className="text-xs font-semibold text-[#1b2a3d]/70">{label}</span>
      <div className="mt-1 flex items-center rounded-xl border border-black/10 bg-white px-3 focus-within:border-[#C8643F]">
        <input
          type="number"
          step={step}
          inputMode="decimal"
          placeholder="0"
          value={raw}
          onFocus={(e) => { editando.current = true; e.target.select(); }}
          onChange={(e) => {
            setRaw(e.target.value);
            const n = parseFloat(e.target.value);
            onChange(Number.isFinite(n) ? n : 0);
          }}
          onBlur={() => { editando.current = false; setRaw(value === 0 ? "" : String(value)); }}
          className="w-full bg-transparent py-2.5 text-sm text-[#16314f] outline-none tabular-nums"
        />
        {suffix && <span className="text-xs text-[#1b2a3d]/50 pl-2 whitespace-pre-line text-right leading-tight">{suffix}</span>}
      </div>
    </label>
  );
};
