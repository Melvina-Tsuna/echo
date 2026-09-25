"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  Profile,
  School,
  SchoolType,
  SCHOOL_TYPE_LABELS,
  Zone,
  ZONE_LABELS,
} from "@/lib/types";

export default function AdminEcolesPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .single();

      if (!profileData || (profileData as Profile).role !== "structure") {
        router.push("/feed");
        return;
      }

      const { data } = await supabase.from("schools").select("*").order("name");
      setSchools((data || []) as School[]);
      setLoading(false);
    }
    load();
  }, [router]);

  function updateLocal(id: string, patch: Partial<School>) {
    setSchools((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  }

  async function handleSave(school: School) {
    setSavingId(school.id);
    setMessage(null);
    const { error } = await supabase
      .from("schools")
      .update({ type: school.type, zone: school.zone })
      .eq("id", school.id);
    setSavingId(null);
    setMessage(
      error
        ? `Erreur pour ${school.name} : ${error.message}`
        : `${school.name} mise à jour.`
    );
  }

  return (
    <main id="contenu-principal" className="max-w-3xl mx-auto px-4 py-8 bg-bg min-h-screen">
      <Link href="/feed" className="text-brand-700 font-bold underline">
        ← Retour au fil
      </Link>
      <h1 className="text-2xl font-bold font-serif mt-3 mb-1">
        Écoles : type et zone
      </h1>
      <p className="text-muted mb-6">
        Corrige le type (publique/privée) et la zone (pôle de développement
        territorial) de chaque école enregistrée.
      </p>

      {loading && <p>Chargement…</p>}

      {message && (
        <p role="status" className="mb-4 font-semibold text-brand-700">
          {message}
        </p>
      )}

      {!loading && (
        <ul className="space-y-3">
          {schools.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border-2 border-border bg-surface p-4 space-y-3"
            >
              <p className="font-bold m-0">
                {s.name} <span className="text-muted font-normal">({s.city})</span>
              </p>

              <div className="flex flex-wrap gap-3">
                <div>
                  <label
                    htmlFor={`type-${s.id}`}
                    className="block text-sm font-bold mb-1"
                  >
                    Type
                  </label>
                  <select
                    id={`type-${s.id}`}
                    value={s.type}
                    onChange={(e) =>
                      updateLocal(s.id, { type: e.target.value as SchoolType })
                    }
                    className="border-2 border-border bg-bg text-ink rounded-lg p-2"
                  >
                    {(Object.keys(SCHOOL_TYPE_LABELS) as SchoolType[]).map(
                      (t) => (
                        <option key={t} value={t}>
                          {SCHOOL_TYPE_LABELS[t]}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`zone-${s.id}`}
                    className="block text-sm font-bold mb-1"
                  >
                    Zone
                  </label>
                  <select
                    id={`zone-${s.id}`}
                    value={s.zone ?? ""}
                    onChange={(e) =>
                      updateLocal(s.id, {
                        zone: (e.target.value || null) as Zone | null,
                      })
                    }
                    className="border-2 border-border bg-bg text-ink rounded-lg p-2"
                  >
                    <option value="">— Non renseignée —</option>
                    {(Object.keys(ZONE_LABELS) as Zone[]).map((z) => (
                      <option key={z} value={z}>
                        {ZONE_LABELS[z]}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleSave(s)}
                  disabled={savingId === s.id}
                  className="self-end bg-brand-600 text-brand-ink font-bold rounded-lg px-4 py-2 disabled:opacity-60"
                >
                  {savingId === s.id ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
