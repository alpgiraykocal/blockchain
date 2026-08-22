"use client";

import { I18nProvider } from "./context";
import { tr } from "./dictionaries/tr";

/** The Turkish counterpart of `provider-en.tsx`. */
export function TrProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider locale="tr" dictionary={tr}>
      {children}
    </I18nProvider>
  );
}
