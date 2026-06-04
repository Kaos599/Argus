import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TamboClientRoot } from "@/components/TamboClientRoot";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Argus — the agentic analyst for MongoDB Atlas",
  description:
    "Turn a MongoDB connection string into a board, a chat, and a natural-language interface. Three layers of write protection.",
  applicationName: "Argus",
  authors: [{ name: "Argus team" }],
  keywords: ["MongoDB", "Atlas", "analytics", "AI", "Tambo", "agentic"],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-argus-bg text-argus-text font-sans antialiased">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <ThemeProvider>
          <TamboClientRoot>{children}</TamboClientRoot>
        </ThemeProvider>
      </body>
    </html>
  );
}
