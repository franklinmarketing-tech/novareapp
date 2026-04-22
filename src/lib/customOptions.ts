export type SelectOption = { value: string; label: string; custom?: boolean };

const CUSTOM_PREFIX = "custom:";

export const normalizeCustomValue = (value?: string | null) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.startsWith(CUSTOM_PREFIX) ? trimmed.slice(CUSTOM_PREFIX.length).trim() : trimmed;
};

export const mergeCustomOptions = <T extends SelectOption>(
  baseOptions: T[],
  values: Array<string | null | undefined>,
  createOption?: (value: string) => T,
) => {
  const seen = new Set<string>();
  const merged = baseOptions.map((option) => {
    seen.add(normalizeCustomValue(option.value).toLocaleLowerCase("pt-BR"));
    seen.add(normalizeCustomValue(option.label).toLocaleLowerCase("pt-BR"));
    return option;
  });

  values.forEach((rawValue) => {
    const cleanValue = normalizeCustomValue(rawValue);
    if (!cleanValue) return;

    const key = cleanValue.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) return;

    seen.add(key);
    merged.push(createOption ? { ...createOption(cleanValue), custom: true } : ({ value: cleanValue, label: cleanValue, custom: true } as T));
  });

  return merged;
};