"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { EcosystemLink } from "@/lib/types";
import AudioButton from "@/components/AudioButton";

const CATEGORY_ICONS: Record<string, string> = {
  "Gestion scolaire / examens": "🏫",
  "Bourses d'études": "🎓",
  "Contenus accessibles": "♿",
  "Formation professionnelle": "🛠️",
  Institutionnel: "🏛️",
};

export default function EcosystemPage() {
  const [links, setLinks] = useState<EcosystemLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("ecosystem_links")
      .select("*")
      .order("sort_order")
      .then(({ data }) => {
        setLinks(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <main id="contenu-principal" className="max-w-2xl mx-auto px-4 py-8 bg-bg min-h-screen">
      <Link href="/" className="text-brand-700 font-bold underline">
        ← Accueil
      </Link>
      <h1 className="text-2xl font-bold font-serif mt-3 mb-1">
        Autres plateformes utiles
      </h1>
      <p className="text-muted mb-6">
        Écho se concentre sur les échanges entre écoles et familles.
        Pour les démarches ci-dessous, ces plateformes existent déjà.
      </p>

      {loading && <p>Chargement…</p>}

      <div className="space-y-3.5">
        {links.map((link) => (
          <article
            key={link.id}
            className="border-2 border-border rounded-xl p-5 bg-surface"
          >
            <div className="flex items-start gap-3 mb-1">
              <span className="text-2xl leading-none" role="img" aria-hidden="true">
                {CATEGORY_ICONS[link.category] || "🔗"}
              </span>
              <div>
                <p className="text-xs font-bold text-brand-700 uppercase tracking-wide m-0">
                  {link.category}
                </p>
                <h2 className="text-lg font-bold font-serif mt-0.5 mb-0">{link.name}</h2>
              </div>
            </div>
            <p className="big-text mt-2 mb-3.5">{link.description}</p>
            <div className="flex flex-wrap gap-2.5">
              <AudioButton
                text={`${link.name}. ${link.description}`}
                label="Écouter"
                context={link.name}
              />
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 text-brand-ink font-bold px-4 py-2"
              >
                Ouvrir le site ↗
              </a>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
