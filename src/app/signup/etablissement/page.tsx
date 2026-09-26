"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  School,
  SchoolClass,
  SchoolType,
  SCHOOL_TYPE_LABELS,
  Zone,
  ZONE_LABELS,
} from "@/lib/types";

type EtablissementRole = "teacher" | "school";

const ROLE_LABELS: Record<EtablissementRole, string> = {
  teacher: "Enseignant",
  school: "École",
};

interface TeacherClassRow {
  schoolId: string;
  classId: string;
  creatingNewClass: boolean;
  newClassName: string;
  confirmed: boolean;
}

function emptyTeacherRow(): TeacherClassRow {
  return {
    schoolId: "",
    classId: "",
    creatingNewClass: false,
    newClassName: "",
    confirmed: false,
  };
}

export default function SignupEtablissementPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [classesBySchool, setClassesBySchool] = useState<
    Record<string, SchoolClass[]>
  >({});
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<EtablissementRole>("teacher");

  // Rôle "école"
  const [schoolId, setSchoolId] = useState("");
  const [creatingNewSchool, setCreatingNewSchool] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolCity, setNewSchoolCity] = useState("");
  const [newSchoolType, setNewSchoolType] = useState<SchoolType>("publique");
  const [newSchoolZone, setNewSchoolZone] = useState<Zone | "">("");

  // Rôle "enseignant" : une ou plusieurs classes, potentiellement dans des
  // écoles différentes.
  const [teacherRows, setTeacherRows] = useState<TeacherClassRow[]>([
    emptyTeacherRow(),
  ]);
  const [teacherRowErrors, setTeacherRowErrors] = useState<
    Record<number, string>
  >({});

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("schools")
      .select("*")
      .order("name")
      .then(({ data }) => setSchools(data || []));
  }, []);

  async function loadClassesForSchool(schoolId: string) {
    if (classesBySchool[schoolId]) return;
    const { data } = await supabase
      .from("classes")
      .select("*")
      .eq("school_id", schoolId)
      .order("name");
    setClassesBySchool((prev) => ({ ...prev, [schoolId]: data || [] }));
  }

  function updateTeacherRow(index: number, patch: Partial<TeacherClassRow>) {
    setTeacherRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r))
    );
  }

  function addTeacherRow() {
    setTeacherRows((prev) => [...prev, emptyTeacherRow()]);
  }

  function removeTeacherRow(index: number) {
    setTeacherRows((prev) => prev.filter((_, i) => i !== index));
    setTeacherRowErrors((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([i, msg]) => {
        const n = Number(i);
        if (n < index) next[n] = msg;
        else if (n > index) next[n - 1] = msg;
      });
      return next;
    });
  }

  function validateTeacherRow(index: number) {
    const row = teacherRows[index];
    if (!row.schoolId || (row.creatingNewClass ? !row.newClassName : !row.classId)) {
      setTeacherRowErrors((prev) => ({
        ...prev,
        [index]: "Merci de renseigner l'école et la classe.",
      }));
      return;
    }
    setTeacherRowErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    updateTeacherRow(index, { confirmed: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (
      role === "school" &&
      creatingNewSchool &&
      (!newSchoolName || !newSchoolCity || !newSchoolZone)
    ) {
      setError("Merci de renseigner le nom, la ville et la zone de l'école.");
      return;
    }
    if (role === "school" && !creatingNewSchool && !schoolId) {
      setError("Merci de choisir une école.");
      return;
    }
    if (
      role === "teacher" &&
      teacherRows.some(
        (r) =>
          !r.schoolId || (r.creatingNewClass ? !r.newClassName : !r.classId)
      )
    ) {
      setError("Merci de renseigner l'école et la classe de chaque ligne.");
      return;
    }
    if (role === "teacher" && teacherRows.some((r) => !r.confirmed)) {
      setError("Merci de valider chaque classe avant de créer le compte.");
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
        .insert({
          name: newSchoolName,
          city: newSchoolCity,
          type: newSchoolType,
          zone: newSchoolZone,
        })
        .select()
        .single();

      if (schoolError || !newSchool) {
        setError(schoolError?.message || "Erreur lors de la création de l'école.");
        setLoading(false);
        return;
      }
      finalSchoolId = newSchool.id;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      full_name: fullName,
      role,
      school_id: role === "school" ? finalSchoolId : null,
      class_id: null,
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    if (role === "teacher") {
      const teacherClassInserts: {
        teacher_id: string;
        school_id: string;
        class_id: string;
      }[] = [];

      for (const row of teacherRows) {
        let finalClassId = row.classId;
        if (row.creatingNewClass) {
          const { data: newClass, error: classError } = await supabase
            .from("classes")
            .insert({ name: row.newClassName, school_id: row.schoolId })
            .select()
            .single();

          if (classError || !newClass) {
            setError(
              classError?.message || "Erreur lors de la création d'une classe."
            );
            setLoading(false);
            return;
          }
          finalClassId = newClass.id;
        }
        teacherClassInserts.push({
          teacher_id: data.user.id,
          school_id: row.schoolId,
          class_id: finalClassId,
        });
      }

      const { error: tcError } = await supabase
        .from("teacher_classes")
        .insert(teacherClassInserts);

      if (tcError) {
        setError(tcError.message);
        setLoading(false);
        return;
      }
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

        {role === "school" &&
          (creatingNewSchool ? (
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
              <div>
                <label htmlFor="new-school-type" className="block font-bold mb-1.5 text-sm">
                  Type d&apos;école
                </label>
                <select
                  id="new-school-type"
                  required
                  value={newSchoolType}
                  onChange={(e) => setNewSchoolType(e.target.value as SchoolType)}
                  className="w-full border-2 border-border bg-surface text-ink rounded-[10px] p-3 text-lg"
                >
                  {(Object.keys(SCHOOL_TYPE_LABELS) as SchoolType[]).map((t) => (
                    <option key={t} value={t}>
                      {SCHOOL_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="new-school-zone" className="block font-bold mb-1.5 text-sm">
                  Zone (pôle de développement territorial)
                </label>
                <select
                  id="new-school-zone"
                  required
                  value={newSchoolZone}
                  onChange={(e) => setNewSchoolZone(e.target.value as Zone)}
                  className="w-full border-2 border-border bg-surface text-ink rounded-[10px] p-3 text-lg"
                >
                  <option value="">— Choisir une zone —</option>
                  {(Object.keys(ZONE_LABELS) as Zone[]).map((z) => (
                    <option key={z} value={z}>
                      {ZONE_LABELS[z]}
                    </option>
                  ))}
                </select>
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
                    {s.name} ({s.city}, {SCHOOL_TYPE_LABELS[s.type]}
                    {s.zone ? `, ${ZONE_LABELS[s.zone]}` : ""})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setCreatingNewSchool(true)}
                className="mt-2 text-brand-700 font-semibold underline text-sm"
              >
                Mon école n&apos;est pas dans la liste, la créer
              </button>
            </div>
          ))}

        {role === "teacher" && (
          <fieldset className="space-y-4">
            <legend className="font-bold mb-1 text-sm">Mes classes</legend>
            <p className="text-sm text-muted -mt-2">
              Tu peux enseigner dans plusieurs classes, même dans des écoles
              différentes.
            </p>
            {teacherRows.map((row, index) => {
              const schoolName = schools.find((s) => s.id === row.schoolId)?.name;
              const className = row.creatingNewClass
                ? row.newClassName
                : (classesBySchool[row.schoolId] || []).find(
                    (c) => c.id === row.classId
                  )?.name;

              if (row.confirmed) {
                return (
                  <div
                    key={index}
                    className="border-2 border-brand-600 bg-brand-50 rounded-[10px] p-4 flex items-center justify-between gap-3"
                  >
                    <p className="m-0">
                      <span className="font-bold">{schoolName}</span>
                      {className && <span>, {className}</span>}
                    </p>
                    <div className="flex gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateTeacherRow(index, { confirmed: false })}
                        className="text-brand-700 font-semibold text-sm underline"
                      >
                        Modifier
                      </button>
                      {teacherRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTeacherRow(index)}
                          className="text-danger font-bold text-sm underline"
                        >
                          Retirer
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              return (
              <div
                key={index}
                className="border-2 border-border rounded-[10px] p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm">Classe {index + 1}</p>
                  {teacherRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTeacherRow(index)}
                      className="text-danger font-bold text-sm underline"
                    >
                      Retirer
                    </button>
                  )}
                </div>

                <div>
                  <label
                    htmlFor={`teacher-school-${index}`}
                    className="block font-bold mb-1.5 text-sm"
                  >
                    École
                  </label>
                  <select
                    id={`teacher-school-${index}`}
                    required
                    value={row.schoolId}
                    onChange={(e) => {
                      updateTeacherRow(index, {
                        schoolId: e.target.value,
                        classId: "",
                        creatingNewClass: false,
                      });
                      if (e.target.value) loadClassesForSchool(e.target.value);
                    }}
                    className="w-full border-2 border-border bg-surface text-ink rounded-[10px] p-3 text-lg"
                  >
                    <option value="">— Choisir une école —</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.city}, {SCHOOL_TYPE_LABELS[s.type]}
                        {s.zone ? `, ${ZONE_LABELS[s.zone]}` : ""})
                      </option>
                    ))}
                  </select>
                </div>

                {row.schoolId &&
                  (row.creatingNewClass ? (
                    <div>
                      <label
                        htmlFor={`teacher-new-class-${index}`}
                        className="block font-bold mb-1.5 text-sm"
                      >
                        Nom de la classe
                      </label>
                      <input
                        id={`teacher-new-class-${index}`}
                        required
                        placeholder="ex. CM2 A"
                        value={row.newClassName}
                        onChange={(e) =>
                          updateTeacherRow(index, { newClassName: e.target.value })
                        }
                        className="w-full border-2 border-border bg-surface text-ink rounded-[10px] p-3 text-lg"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateTeacherRow(index, { creatingNewClass: false })
                        }
                        className="mt-2 text-brand-700 font-semibold underline text-sm"
                      >
                        Ma classe existe déjà dans la liste
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor={`teacher-class-${index}`}
                        className="block font-bold mb-1.5 text-sm"
                      >
                        Classe
                      </label>
                      <select
                        id={`teacher-class-${index}`}
                        required
                        value={row.classId}
                        onChange={(e) =>
                          updateTeacherRow(index, { classId: e.target.value })
                        }
                        className="w-full border-2 border-border bg-surface text-ink rounded-[10px] p-3 text-lg"
                      >
                        <option value="">— Choisir une classe —</option>
                        {(classesBySchool[row.schoolId] || []).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          updateTeacherRow(index, { creatingNewClass: true })
                        }
                        className="mt-2 text-brand-700 font-semibold underline text-sm"
                      >
                        Ma classe n&apos;est pas dans la liste, la créer
                      </button>
                    </div>
                  ))}

                {teacherRowErrors[index] && (
                  <p role="alert" className="text-danger font-bold text-sm">
                    {teacherRowErrors[index]}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => validateTeacherRow(index)}
                  className="bg-brand-600 text-brand-ink font-bold rounded-[10px] px-4 py-2"
                >
                  Valider cette classe
                </button>
              </div>
              );
            })}

            <button
              type="button"
              onClick={addTeacherRow}
              className="border-2 border-brand-600 text-brand-700 font-bold rounded-[10px] px-4 py-2.5"
            >
              + Ajouter une classe
            </button>
          </fieldset>
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
