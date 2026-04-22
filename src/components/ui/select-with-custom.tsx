import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { normalizeCustomValue, mergeCustomOptions } from "@/lib/customOptions";

interface SelectWithCustomProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string; custom?: boolean }[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  inputPlaceholder?: string;
}

/**
 * A Select dropdown that includes a "Personalizado" option.
 * When selected, it shows an inline text input for custom values.
 * The custom value is stored with a "custom:" prefix while editing.
 */
export const SelectWithCustom = ({
  value,
  onValueChange,
  options,
  placeholder = "Selecione",
  triggerClassName = "",
  inputPlaceholder = "Digite aqui...",
}: SelectWithCustomProps) => {
  const isCustom = !!value?.startsWith("custom:");
  const normalizedValue = normalizeCustomValue(value);
  const safeOptions = mergeCustomOptions(options, [value]);
  const [showCustomInput, setShowCustomInput] = useState(isCustom);
  const customText = isCustom ? normalizedValue : "";

  useEffect(() => {
    setShowCustomInput(!!value?.startsWith("custom:"));
  }, [value]);

  const handleSelectChange = (v: string) => {
    if (v === "__custom__") {
      setShowCustomInput(true);
      onValueChange("custom:");
    } else {
      setShowCustomInput(false);
      onValueChange(v);
    }
  };

  const handleCustomInput = (text: string) => {
    onValueChange(`custom:${text}`);
  };

  const commitCustomInput = () => {
    const clean = normalizedValue.trim();
    if (!clean) return;
    setShowCustomInput(false);
    onValueChange(clean);
  };

  if (showCustomInput) {
    return (
      <div
        className="relative rounded-xl px-3 py-2.5 flex items-center gap-2"
        style={{
          border: "2px dashed hsl(var(--primary) / 0.35)",
          background: "hsl(var(--primary) / 0.03)",
        }}
      >
        <span className="text-primary text-sm shrink-0">✏️</span>
        <Input
          value={customText}
          onChange={(e) => handleCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitCustomInput();
            }
          }}
          onBlur={commitCustomInput}
          placeholder={inputPlaceholder}
          className={`flex-1 min-w-0 border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 h-auto text-[0.9375rem] placeholder:text-muted-foreground/50 ${triggerClassName}`}
          autoFocus
        />
        <button
          type="button"
          onClick={() => {
            setShowCustomInput(false);
            onValueChange("");
          }}
          className="text-xs text-muted-foreground hover:text-destructive px-1.5 py-1 rounded-md hover:bg-destructive/10 shrink-0 transition-all"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <Select value={isCustom ? normalizedValue : value} onValueChange={handleSelectChange}>
      <SelectTrigger className={`border-border bg-background ${triggerClassName}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-w-[calc(100vw-1rem)]">
        {safeOptions.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <span className="flex w-full items-center justify-between gap-3">
              <span>{opt.label}</span>
              {opt.custom && <span className="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Personalizado</span>}
            </span>
          </SelectItem>
        ))}
        <SelectItem value="__custom__" className="text-primary font-medium border-t mt-1 pt-1">
          ✏️ Personalizado
        </SelectItem>
      </SelectContent>
    </Select>
  );
};
