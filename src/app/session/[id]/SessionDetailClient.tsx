"use client";
import { useT } from "@/components/LanguageProvider";

export function SessionBackLabel() {
  const { t } = useT();
  return <>{t.back}</>;
}

export function SessionEditLabel() {
  const { t } = useT();
  return <>{t.edit}</>;
}

export function SessionTotalLabel({ line }: { line: string }) {
  const { t } = useT();
  return <>{t.totalLabel} {line}</>;
}

export function SessionWeightLabel({ value }: { value: string | null }) {
  const { t } = useT();
  const label = value ? `${value} kg` : t.unknown;
  return <>{t.weightLabel} = {label}</>;
}
