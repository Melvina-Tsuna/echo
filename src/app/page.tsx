"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BeninFlag from "@/components/BeninFlag";

const ROLE_LINKS = [
  { href: "/signup/famille", icon: "👪", label: "Famille" },
  { href: "/signup/etablissement", icon: "🏫", label: "Établissement" },
  { href: "/signup/structure", icon: "🏛️", label: "Structure" },
];

export default function HomePage() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((i) => (i + 1) % ROLE_LINKS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <main id="contenu-principal" className="min-h-screen flex flex-col">
      <section className="flex-1 flex flex-col items-center justify-center text-center gap-6 px-4 py-16 bg-brand-50">
        <h1 className="text-[clamp(2rem,6vw,2.7rem)] font-bold text-brand-700 m-0">
          Écho
        </h1>
        <p className="max-w-[480px] text-[1.15rem] text-ink m-0">
          Le lien entre les écoles et les familles. Chaque message est
          proposé en texte clair, en audio et avec des pictogrammes: même
          sans connexion internet.
        </p>

        <div className="w-full max-w-[480px]">
          <p className="font-bold mb-3 text-ink">Je crée un compte en tant que…</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {ROLE_LINKS.map((role, i) => (
              <Link
                key={role.href}
                href={role.href}
                className={`flex flex-col items-center gap-2 bg-brand-600 text-brand-ink font-bold rounded-[10px] px-4 py-5 ${
                  i === activeIndex ? "pulse-guide" : ""
                }`}
              >
                <span aria-hidden="true" className="text-3xl">
                  {role.icon}
                </span>
                {role.label}
              </Link>
            ))}
          </div>
        </div>

        <Link
          href="/login"
          className="border-2 border-brand-600 text-brand-700 font-bold rounded-[10px] px-7 py-3.5"
        >
          J&apos;ai déjà un compte, me connecter
        </Link>

        <Link
          href="/ecosystem"
          className="flex items-center gap-2.5 border-2 border-brand-600 text-brand-700 font-bold rounded-[10px] px-6 py-3"
        >
          <BeninFlag className="w-7 h-5" />
          Voir les autres plateformes d&apos;éducation au Bénin
        </Link>
      </section>
    </main>
  );
}
