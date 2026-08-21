import type { Metadata, Viewport } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { PrimarySearchProvider } from "@/components/primary-search";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

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

export const metadata: Metadata = {
  title: {
    default: "Blockchain Analysis — cryptoasset graph analytics",
    template: "%s · Blockchain Analysis",
  },
  description:
    "Interactive address, entity and transaction-flow analysis for Bitcoin and Ethereum, built on public block explorer data.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#070d1a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${firaSans.variable} ${firaCode.variable} antialiased`}>
        <ThemeProvider>
          <PrimarySearchProvider>
            <AppShell>{children}</AppShell>
          </PrimarySearchProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
