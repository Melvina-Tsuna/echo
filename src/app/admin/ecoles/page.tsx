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

const ZONE_ORDER: Zone[] = [
  "grand_nokoue",
  "nord_ouest",
  "nord_est",
  "centre",
  "sud_ouest",
  "sud_est",
];

export default function AdminEcolesPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newType, setNewType] = useState<SchoolType>("publique");
  const [newZone, setNewZone] = useState<Zone | "">("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function reloadSchools() {
    const { data } = await supabase.from("schools").select("*").order("name");
    setSchools((data || []) as School[]);
  }

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

      await reloadSchools();
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

  async function handleAddSchool(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);

    if (!newName || !newCity || !newZone) {
      setAddError("Merci de renseigner le nom, la ville et la zone.");
      return;
    }

    setAdding(true);
    const { error } = await supabase.from("schools").insert({
      name: newName,
      city: newCity,
      type: newType,
      zone: newZone,
    });
    setAdding(false);

    if (error) {
      setAddError(error.message);
      return;
    }

    setNewName("");
    setNewCity("");
    setNewType("publique");
    setNewZone("");
    await reloadSchools();
  }

  const schoolsByZone: Partial<Record<Zone | "none", School[]>> = {};
  schools.forEach((s) => {
    const key = s.zone ?? "none";
    (schoolsByZone[key] ||= []).push(s);
  });

  return (
    <main id="contenu-principal" className="max-w-3xl mx-auto px-4 py-8 bg-bg min-h-screen">
      <Link href="/feed" className="text-brand-700 font-bold underline">
        ← Retour au fil
      </Link>
      <h1 className="text-2xl font-bold font-serif mt-3 mb-1">
        Écoles par zone
      </h1>
      <p className="text-muted mb-6">
        Ajoute une école ou corrige le type (publique/privée) et la zone
        (pôle de développement territorial) de chaque école enregistrée.
      </p>

      <section className="rounded-xl border-2 border-border bg-surface p-4 mb-8">
        <h2 className="font-bold text-lg m-0 mb-3">Ajouter une école</h2>
        <form onSubmit={handleAddSchool} className="space-y-3" noValidate>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-school-name" className="block text-sm font-bold mb-1">
                Nom de l&apos;école
              </label>
              <input
                id="new-school-name"
                required
                placeholder="ex. EPP Godomey"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full border-2 border-border bg-bg text-ink rounded-lg p-2"
              />
            </div>
            <div>
              <label htmlFor="new-school-city" className="block text-sm font-bold mb-1">
                Ville
              </label>
              <input
                id="new-school-city"
                required
                placeholder="ex. Cotonou"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                className="w-full border-2 border-border bg-bg text-ink rounded-lg p-2"
              />
            </div>
            <div>
              <label htmlFor="new-school-type" className="block text-sm font-bold mb-1">
                Type
              </label>
              <select
                id="new-school-type"
                required
                value={newType}
                onChange={(e) => setNewType(e.target.value as SchoolType)}
                className="w-full border-2 border-border bg-bg text-ink rounded-lg p-2"
              >
                {(Object.keys(SCHOOL_TYPE_LABELS) as SchoolType[]).map((t) => (
                  <option key={t} value={t}>
                    {SCHOOL_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="new-school-zone" className="block text-sm font-bold mb-1">
                Zone
              </label>
              <select
                id="new-school-zone"
                required
                value={newZone}
                onChange={(e) => setNewZone(e.target.value as Zone)}
                className="w-full border-2 border-border bg-bg text-ink rounded-lg p-2"
              >
                <option value="">— Choisir une zone —</option>
                {ZONE_ORDER.map((z) => (
                  <option key={z} value={z}>
                    {ZONE_LABELS[z]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {addError && (
            <p role="alert" className="text-danger font-bold text-sm">
              {addError}
            </p>
          )}

          <button
            type="submit"
            disabled={adding}
            className="bg-brand-600 text-brand-ink font-bold rounded-lg px-4 py-2 disabled:opacity-60"
          >
            {adding ? "Ajout…" : "Ajouter cette école"}
          </button>
        </form>
      </section>

      {loading && <p>Chargement…</p>}

      {message && (
        <p role="status" className="mb-4 font-semibold text-brand-700">
          {message}
        </p>
      )}

      {!loading &&
        [...ZONE_ORDER, "none" as const].map((key) => {
          const group = schoolsByZone[key];
          if (!group || group.length === 0) return null;
          const heading = key === "none" ? "Zone non renseignée" : ZONE_LABELS[key];

          return (
            <section key={key} className="mb-6">
              <h2 className="font-bold text-lg mb-3">{heading}</h2>
              <ul className="space-y-3">
                {group.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-xl border-2 border-border bg-surface p-4 space-y-3"
                  >
                    <p className="font-bold m-0">
                      {s.name}{" "}
                      <span className="text-muted font-normal">({s.city})</span>
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
                            updateLocal(s.id, {
                              type: e.target.value as SchoolType,
                            })
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
                          {ZONE_ORDER.map((z) => (
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
            </section>
          );
        })}
    </main>
  );
}
