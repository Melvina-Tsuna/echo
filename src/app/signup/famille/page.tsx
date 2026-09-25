"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { School, SchoolClass } from "@/lib/types";

interface ChildDraft {
  fullName: string;
  schoolId: string;
  classId: string;
}

function emptyChild(): ChildDraft {
  return { fullName: "", schoolId: "", classId: "" };
}

export default function SignupFamillePage() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [classesBySchool, setClassesBySchool] = useState<
    Record<string, SchoolClass[]>
  >({});
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [children, setChildren] = useState<ChildDraft[]>([emptyChild()]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("schools")
      .select("*")
      .order("name")
      .then(({ data }) => setSchools(data || []));
  }, []);

  async function loadClasses(schoolId: string) {
    if (classesBySchool[schoolId]) return;
    const { data } = await supabase
      .from("classes")
      .select("*")
      .eq("school_id", schoolId)
      .order("name");
    setClassesBySchool((prev) => ({ ...prev, [schoolId]: data || [] }));
  }

  function updateChild(index: number, patch: Partial<ChildDraft>) {
    setChildren((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c))
    );
  }

  function addChild() {
    setChildren((prev) => [...prev, emptyChild()]);
  }

  function removeChild(index: number) {
    setChildren((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (children.some((c) => !c.fullName || !c.schoolId || !c.classId)) {
      setError("Merci de renseigner le nom, l'école et la classe de chaque enfant.");
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message || "Erreur lors de l'inscription.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      full_name: fullName,
      role: "parent",
      school_id: null,
      class_id: null,
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    const { error: childrenError } = await supabase.from("children").insert(
      children.map((c) => ({
        parent_id: data.user!.id,
        full_name: c.fullName,
        school_id: c.schoolId,
        class_id: c.classId,
      }))
    );

    if (childrenError) {
      setError(childrenError.message);
      setLoading(false);
      return;
    }

    router.push("/feed");
  }

  return (
    <main id="contenu-principal" className="max-w-xl mx-auto px-4 py-10 bg-bg min-h-screen">
      <Link href="/" className="text-brand-700 font-bold underline">
        ← Accueil
      </Link>
      <h1 className="text-2xl font-bold font-serif mt-3 mb-1">
        Créer un compte Famille
      </h1>
      <p className="text-ink mb-6">
        Un seul compte pour suivre tous tes enfants, même dans des écoles ou
        classes différentes.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="fullName" className="block font-bold mb-1.5 text-sm">
            Ton nom complet
          </label>
          <input
            id="fullName"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border-2 border-border bg-surface text-ink rounded-[10px] p-3 text-lg"
          />
        </div>

        <div>
          <label htmlFor="email" className="block font-bold mb-1.5 text-sm">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border-2 border-border bg-surface text-ink rounded-[10px] p-3 text-lg"
          />
        </div>

        <div>
          <label htmlFor="password" className="block font-bold mb-1.5 text-sm">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border-2 border-border bg-surface text-ink rounded-[10px] p-3 text-lg"
          />
        </div>

        <fieldset className="space-y-4">
          <legend className="font-bold mb-1 text-sm">Mes enfants</legend>
          {children.map((child, index) => (
            <div
              key={index}
              className="border-2 border-border rounded-[10px] p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm">Enfant {index + 1}</p>
                {children.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeChild(index)}
                    className="text-danger font-bold text-sm underline"
                  >
                    Retirer
                  </button>
                )}
              </div>

              <div>
                <label
                  htmlFor={`child-name-${index}`}
                  className="block font-bold mb-1.5 text-sm"
                >
                  Nom de l&apos;enfant
                </label>
                <input
                  id={`child-name-${index}`}
                  required
                  value={child.fullName}
                  onChange={(e) => updateChild(index, { fullName: e.target.value })}
                  className="w-full border-2 border-border bg-surface text-ink rounded-[10px] p-3 text-lg"
                />
              </div>

              <div>
                <label
                  htmlFor={`child-school-${index}`}
                  className="block font-bold mb-1.5 text-sm"
                >
                  École
                </label>
                <select
                  id={`child-school-${index}`}
                  required
                  value={child.schoolId}
                  onChange={(e) => {
                    updateChild(index, { schoolId: e.target.value, classId: "" });
                    if (e.target.value) loadClasses(e.target.value);
                  }}
                  className="w-full border-2 border-border bg-surface text-ink rounded-[10px] p-3 text-lg"
                >
                  <option value="">— Choisir une école —</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city})
                    </option>
                  ))}
                </select>
              </div>

              {child.schoolId && (
                <div>
                  <label
                    htmlFor={`child-class-${index}`}
                    className="block font-bold mb-1.5 text-sm"
                  >
                    Classe
                  </label>
                  <select
                    id={`child-class-${index}`}
                    required
                    value={child.classId}
                    onChange={(e) => updateChild(index, { classId: e.target.value })}
                    className="w-full border-2 border-border bg-surface text-ink rounded-[10px] p-3 text-lg"
                  >
                    <option value="">— Choisir une classe —</option>
                    {(classesBySchool[child.schoolId] || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addChild}
            className="border-2 border-brand-600 text-brand-700 font-bold rounded-[10px] px-4 py-2.5"
          >
            + Ajouter un enfant
          </button>
        </fieldset>

        {error && (
          <p role="alert" className="text-danger font-bold">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 text-brand-ink font-bold text-lg rounded-[10px] py-3 disabled:opacity-60"
        >
          {loading ? "Création…" : "Créer mon compte"}
        </button>
      </form>
    </main>
  );
}
