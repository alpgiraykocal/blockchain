import type { Metadata, Viewport } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PrimarySearchProvider } from "@/components/primary-search";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import { getDictionary } from "@/lib/i18n";
import { LOCALES, LOCALE_HTML_LANG, isLocale, localePath } from "@/lib/i18n/config";
import "../globals.css";

const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/** This is the app's root layout: every page lives under a locale segment, so
 *  the `<html>` element can carry the right `lang` without a second source of
 *  truth. Only `/api`, `robots.txt` and `sitemap.xml` sit outside it, and none
 *  of them render a document. */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://blockchain.alpgiraykocal.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { ui } = getDictionary(locale);

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: ui.meta.title, template: ui.meta.titleTemplate },
    description: ui.meta.description,
    alternates: {
      canonical: localePath(locale, "/"),
      // Every page exists in both languages, so each one advertises the other
      // rather than letting a crawler treat them as duplicates.
      languages: {
        ...Object.fromEntries(
          LOCALES.map((code) => [LOCALE_HTML_LANG[code], localePath(code, "/")]),
        ),
        "x-default": localePath("en", "/"),
      },
    },
    openGraph: {
      type: "website",
      siteName: ui.nav.brand,
      title: ui.meta.title,
      description: ui.meta.description,
      locale: locale === "tr" ? "tr_TR" : "en_US",
      url: localePath(locale, "/"),
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#070d1a" },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  // A path such as /de/tags matches this segment but has no dictionary; it is a
  // missing page rather than a reason to fall back and serve the wrong language.
  if (!isLocale(locale)) notFound();

  return (
    <html lang={LOCALE_HTML_LANG[locale]} suppressHydrationWarning>
      <body className={`${firaSans.variable} ${firaCode.variable} antialiased`}>
        <LocaleProvider locale={locale}>
          <ThemeProvider>
            <PrimarySearchProvider>
              <AppShell>{children}</AppShell>
            </PrimarySearchProvider>
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
