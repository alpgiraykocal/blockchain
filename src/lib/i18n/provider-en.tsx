"use client";

import { I18nProvider } from "./context";
import { en } from "./dictionaries/en";

/** Carries the English dictionary and nothing else, so the bundler can put it in
 *  a chunk that a Turkish page never fetches. See `locale-provider.tsx`. */
export function EnProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider locale="en" dictionary={en}>
      {children}
    </I18nProvider>
  );
}
