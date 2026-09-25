"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { School, SchoolClass } from "@/lib/types";

type EtablissementRole = "teacher" | "school";

const ROLE_LABELS: Record<EtablissementRole, string> = {
  teacher: "Enseignant",
  school: "École",
};

export default function SignupEtablissementPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<EtablissementRole>("teacher");
  const [schoolId, setSchoolId] = useState("");
  const [classId, setClassId] = useState("");
  const [creatingNewSchool, setCreatingNewSchool] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolCity, setNewSchoolCity] = useState("");
  const [creatingNewClass, setCreatingNewClass] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("schools")
      .select("*")
      .order("name")
      .then(({ data }) => setSchools(data || []));
  }, []);

  useEffect(() => {
    if (!schoolId) {
      setClasses([]);
      return;
    }
    supabase
      .from("classes")
      .select("*")
      .eq("school_id", schoolId)
      .order("name")
      .then(({ data }) => setClasses(data || []));
  }, [schoolId]);

  const needsClass = role === "teacher";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (role === "school" && creatingNewSchool && (!newSchoolName || !newSchoolCity)) {
      setError("Merci de renseigner le nom et la ville de l'école.");
      return;
    }
    if (role === "school" && !creatingNewSchool && !schoolId) {
      setError("Merci de choisir une école.");
      return;
    }
    if (needsClass && creatingNewClass && !newClassName) {
      setError("Merci de renseigner le nom de la classe.");
      return;
    }
    if (needsClass && !creatingNewClass && !classId) {
      setError("Merci de choisir une classe.");
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

    let finalSchoolId = schoolId || null;

    if (role === "school" && creatingNewSchool) {
      const { data: newSchool, error: schoolError } = await supabase
        .from("schools")
        .insert({ name: newSchoolName, city: newSchoolCity })
        .select()
        .single();

      if (schoolError || !newSchool) {
        setError(schoolError?.message || "Erreur lors de la création de l'école.");
        setLoading(false);
        return;
      }
      finalSchoolId = newSchool.id;
    }

    let finalClassId = classId || null;

    if (needsClass && creatingNewClass) {
      const { data: newClass, error: classError } = await supabase
        .from("classes")
        .insert({ name: newClassName, school_id: finalSchoolId })
        .select()
        .single();

      if (classError || !newClass) {
        setError(classError?.message || "Erreur lors de la création de la classe.");
        setLoading(false);
        return;
      }
      finalClassId = newClass.id;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      full_name: fullName,
      role,
      school_id: finalSchoolId,
      class_id: needsClass ? finalClassId : null,
    });

    if (profileError) {
      setError(profileError.message);
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
      <h1 className="text-2xl font-bold font-serif mt-3 mb-6">
        Créer un compte Établissement
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="fullName" className="block font-bold mb-1.5 text-sm">
            Nom complet
          </label>
          <input
            id="fullName"
            required
            placeholder="ex. Jean AGBOTON"
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
            placeholder="ex. jean@ecole.bj"
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
            placeholder="6 caractères minimum"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border-2 border-border bg-surface text-ink rounded-[10px] p-3 text-lg"
          />
        </div>

        <fieldset>
          <legend className="font-bold mb-2 text-sm">Je suis…</legend>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(ROLE_LABELS) as EtablissementRole[]).map((r) => (
              <label
                key={r}
                className={`border-2 rounded-[10px] p-3 cursor-pointer text-center font-bold ${
                  role === r
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-border bg-surface text-ink"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={role === r}
                  onChange={() => setRole(r)}
                  className="sr-only"
                />
                {ROLE_LABELS[r]}
              </label>
            ))}
          </div>
        </fieldset>

        {role === "school" && creatingNewSchool ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="new-school-name" className="block font-bold mb-1.5 text-sm">
                Nom de l&apos;école
              </label>
              <input
                id="new-school-name"
                required
                placeholder="ex. EPP Godomey"
                value={newSchoolName}
                onChange={(e) => setNewSchoolName(e.target.value)}
                className="w-full border-2 border-border bg-surface text-ink rounded-[10px] p-3 text-lg"
              />
            </div>
            <div>
              <label htmlFor="new-school-city" className="block font-bold mb-1.5 text-sm">
                Ville
              </label>
              <input
                id="new-school-city"
                required
                placeholder="ex. Cotonou"
                value={newSchoolCity}
                onChange={(e) => setNewSchoolCity(e.target.value)}
                className="w-full border-2 border-border bg-surface text-ink rounded-[10px] p-3 text-lg"
              />
            </div>
            <button
              type="button"
              onClick={() => setCreatingNewSchool(false)}
              className="text-brand-700 font-semibold underline text-sm"
            >
              Mon école existe déjà dans la liste
            </button>
          </div>
        ) : (
          <div>
            <label htmlFor="school" className="block font-bold mb-1.5 text-sm">
              École
            </label>
            <select
              id="school"
              required
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="w-full border-2 border-border bg-surface text-ink rounded-[10px] p-3 text-lg"
            >
              <option value="">— Choisir une école —</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.city})
                </option>
              ))}
            </select>
            {role === "school" && (
              <button
                type="button"
                onClick={() => setCreatingNewSchool(true)}
                className="mt-2 text-brand-700 font-semibold underline text-sm"
              >
                Mon école n&apos;est pas dans la liste, la créer
              </button>
            )}
          </div>
        )}

        {needsClass && schoolId && (
          creatingNewClass ? (
            <div>
              <label htmlFor="new-class-name" className="block font-bold mb-1.5 text-sm">
                Nom de la classe
              </label>
              <input
                id="new-class-name"
                required
                placeholder="ex. CM2 A"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="w-full border-2 border-border bg-surface text-ink rounded-[10px] p-3 text-lg"
              />
              <button
                type="button"
                onClick={() => setCreatingNewClass(false)}
                className="mt-2 text-brand-700 font-semibold underline text-sm"
              >
                Ma classe existe déjà dans la liste
              </button>
            </div>
          ) : (
            <div>
              <label htmlFor="class" className="block font-bold mb-1.5 text-sm">
                Classe
              </label>
              <select
                id="class"
                required
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full border-2 border-border bg-surface text-ink rounded-[10px] p-3 text-lg"
              >
                <option value="">— Choisir une classe —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setCreatingNewClass(true)}
                className="mt-2 text-brand-700 font-semibold underline text-sm"
              >
                Ma classe n&apos;est pas dans la liste, la créer
              </button>
            </div>
          )
        )}

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
