import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  /** Numeric string value (e.g. "1234.56"). Empty string when blank. */
  value: string;
  /** Returns the numeric string value (with dot as decimal separator). */
  onChange: (value: string) => void;
}

const formatBRL = (digitsOnly: string): string => {
  if (!digitsOnly) return "";
  // Treat input as cents
  const cents = parseInt(digitsOnly, 10);
  if (isNaN(cents)) return "";
  const reais = cents / 100;
  return reais.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const numericFromDigits = (digitsOnly: string): string => {
  if (!digitsOnly) return "";
  const cents = parseInt(digitsOnly, 10);
  if (isNaN(cents)) return "";
  return (cents / 100).toFixed(2);
};

const digitsFromNumeric = (numeric: string): string => {
  if (!numeric) return "";
  const n = parseFloat(numeric);
  if (isNaN(n)) return "";
  return Math.round(n * 100).toString();
};

/**
 * Currency input formatted as Brazilian Real (R$).
 * - Auto-formats while typing (1.234,56)
 * - Stores value as numeric string with dot decimal (e.g. "1234.56")
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, placeholder = "0,00", ...props }, ref) => {
    const [digits, setDigits] = React.useState<string>(() => digitsFromNumeric(value));

    // Sync external value -> internal digits when value changes externally
    React.useEffect(() => {
      const fromExternal = digitsFromNumeric(value);
      if (fromExternal !== digits) {
        setDigits(fromExternal);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const onlyDigits = e.target.value.replace(/\D/g, "");
      setDigits(onlyDigits);
      onChange(numericFromDigits(onlyDigits));
    };

    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[0.9375rem] font-body select-none">
          R$
        </span>
        <Input
          ref={ref}
          inputMode="numeric"
          value={formatBRL(digits)}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn("pl-9", className)}
          {...props}
        />
      </div>
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";
