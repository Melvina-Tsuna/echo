import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import VoiceWelcome from "@/components/VoiceWelcome";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-fraunces",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-source-sans",
});

export const metadata: Metadata = {
  title: "Écho — Le lien école-familles",
  description:
    "Une plateforme accessible pour connecter enseignants, écoles et familles au Bénin : texte, audio et pictogrammes, même hors ligne.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#164f34",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${sourceSans.variable}`}>
      <body>
        <a href="#contenu-principal" className="skip-link">
          Aller au contenu principal
        </a>
        <ServiceWorkerRegister />
        <VoiceWelcome />
        {children}
      </body>
    </html>
  );
}
