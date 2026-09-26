"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Child, Profile, School, SchoolClass } from "@/lib/types";

interface StudentRow {
  child: Child;
  presentToday: boolean | null; // null = pas encore saisi aujourd'hui
  subject: string;
  score: string;
}

interface ClassOption {
  class_id: string;
  school_id: string;
  name: string;
}

const TODAY = new Date().toISOString().slice(0, 10);

export default function TrackPage() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<Profile | null>(null);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [schools, setSchools] = useState<School[]>([]);
  const [classesBySchool, setClassesBySchool] = useState<
    Record<string, SchoolClass[]>
  >({});
  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassSchoolId, setNewClassSchoolId] = useState("");
  const [newClassId, setNewClassId] = useState("");
  const [creatingNewClass, setCreatingNewClass] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [addClassError, setAddClassError] = useState<string | null>(null);
  const [addingClass, setAddingClass] = useState(false);

  const loadClassOptions = useCallback(async (teacherId: string) => {
    const { data: tcData } = await supabase
      .from("teacher_classes")
      .select("class_id, school_id")
      .eq("teacher_id", teacherId);

    const classIds = (tcData || []).map((tc) => tc.class_id);
    const { data: classesData } =
      classIds.length > 0
        ? await supabase.from("classes").select("*").in("id", classIds)
        : { data: [] as SchoolClass[] };
    const nameById: Record<string, string> = {};
    (classesData || []).forEach((c) => {
      nameById[c.id] = c.name;
    });

    const options = (tcData || []).map((tc) => ({
      class_id: tc.class_id,
      school_id: tc.school_id,
      name: nameById[tc.class_id] ?? "?",
    }));
    setClassOptions(options);
    return options;
  }, []);

  const loadClassData = useCallback(async (classId: string) => {
    setLoading(true);

    const { data: students } = await supabase
      .from("children")
      .select("*")
      .eq("class_id", classId)
      .order("full_name");

    const { data: todayAttendance } = await supabase
      .from("attendance")
      .select("student_id, present")
      .eq("class_id", classId)
      .eq("date", TODAY);

    const attendanceMap = new Map(
      (todayAttendance || []).map((a) => [a.student_id, a.present])
    );

    setRows(
      (students || []).map((s) => ({
        child: s as Child,
        presentToday: attendanceMap.has(s.id) ? attendanceMap.get(s.id)! : null,
        subject: "",
        score: "",
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
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

      if (!profileData || profileData.role !== "teacher") {
        router.push("/feed");
        return;
      }
      setTeacher(profileData as Profile);

      const { data: schoolsData } = await supabase
        .from("schools")
        .select("*")
        .order("name");
      setSchools(schoolsData || []);

      const options = await loadClassOptions(profileData.id);

      if (options.length > 0) {
        setSelectedClassId(options[0].class_id);
        await loadClassData(options[0].class_id);
      } else {
        setLoading(false);
      }
    }
    init();
  }, [router, loadClassData, loadClassOptions]);

  async function loadClassesForSchool(schoolId: string) {
    if (classesBySchool[schoolId]) return;
    const { data } = await supabase
      .from("classes")
      .select("*")
      .eq("school_id", schoolId)
      .order("name");
    setClassesBySchool((prev) => ({ ...prev, [schoolId]: data || [] }));
  }

  async function handleAddClass(e: React.FormEvent) {
    e.preventDefault();
    if (!teacher) return;
    setAddClassError(null);

    if (!newClassSchoolId || (creatingNewClass ? !newClassName : !newClassId)) {
      setAddClassError("Merci de choisir l'école et la classe.");
      return;
    }

    setAddingClass(true);

    let finalClassId = newClassId;
    if (creatingNewClass) {
      const { data: newClass, error: classError } = await supabase
        .from("classes")
        .insert({ name: newClassName, school_id: newClassSchoolId })
        .select()
        .single();
      if (classError || !newClass) {
        setAddClassError(
          classError?.message || "Erreur lors de la création de la classe."
        );
        setAddingClass(false);
        return;
      }
      finalClassId = newClass.id;
    }

    const { error: tcError } = await supabase.from("teacher_classes").insert({
      teacher_id: teacher.id,
      school_id: newClassSchoolId,
      class_id: finalClassId,
    });
    setAddingClass(false);

    if (tcError) {
      setAddClassError(tcError.message);
      return;
    }

    setNewClassSchoolId("");
    setNewClassId("");
    setCreatingNewClass(false);
    setNewClassName("");
    setShowAddClass(false);

    await loadClassOptions(teacher.id);
    setSelectedClassId(finalClassId);
    await loadClassData(finalClassId);
  }

  async function handleClassChange(classId: string) {
    setSelectedClassId(classId);
    setMessage(null);
    await loadClassData(classId);
  }

  async function markAttendance(studentId: string, present: boolean) {
    if (!teacher || !selectedClassId) return;
    setSavingId(studentId);
    const { error } = await supabase.from("attendance").upsert(
      {
        student_id: studentId,
        class_id: selectedClassId,
        date: TODAY,
        present,
        recorded_by: teacher.id,
      },
      { onConflict: "student_id,date" }
    );
    setSavingId(null);
    if (!error) {
      setRows((prev) =>
        prev.map((r) =>
          r.child.id === studentId ? { ...r, presentToday: present } : r
        )
      );
      setMessage("Présence enregistrée.");
    } else {
      setMessage("Erreur : " + error.message);
    }
  }

  async function saveGrade(studentId: string) {
    if (!teacher || !selectedClassId) return;
    const row = rows.find((r) => r.child.id === studentId);
    if (!row || !row.subject || !row.score) return;

    setSavingId(studentId);
    const { error } = await supabase.from("grades").insert({
      student_id: studentId,
      class_id: selectedClassId,
      subject: row.subject,
      score: parseFloat(row.score),
      max_score: 20,
      evaluated_at: TODAY,
      recorded_by: teacher.id,
    });
    setSavingId(null);
    if (!error) {
      setRows((prev) =>
        prev.map((r) =>
          r.child.id === studentId ? { ...r, subject: "", score: "" } : r
        )
      );
      setMessage("Note enregistrée. Une alerte se déclenche automatiquement en cas de chute importante.");
    } else {
      setMessage("Erreur : " + error.message);
    }
  }

  if (loading && classOptions.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-10">
        <p>Chargement…</p>
      </main>
    );
  }

  return (
    <main id="contenu-principal" className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/feed" className="text-brand-700 font-semibold underline">
        ← Retour au fil
      </Link>
      <h1 className="text-2xl font-bold mt-3 mb-2">Suivi de classe</h1>
      <p className="text-gray-600 mb-6">
        Marque les présences du jour et enregistre les notes. Une alerte est
        créée automatiquement si le taux d&apos;absence dépasse 25 % sur 15
        jours, ou si une note chute de 30 % ou plus par rapport à la
        précédente dans la même matière.
      </p>

      <div className="mb-6">
        {classOptions.length === 0 && !showAddClass && (
          <p className="text-gray-600 mb-2">
            Aucune classe rattachée à ton compte pour le moment.
          </p>
        )}

        {classOptions.length > 0 && (
          <div className="mb-2">
            <label htmlFor="class-select" className="block font-semibold mb-1.5 text-sm">
              Classe
            </label>
            <select
              id="class-select"
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="border-2 border-gray-300 rounded-lg p-2.5 text-lg"
            >
              {classOptions.map((c) => (
                <option key={c.class_id} value={c.class_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {!showAddClass ? (
          <button
            type="button"
            onClick={() => setShowAddClass(true)}
            className="border-2 border-brand-600 text-brand-700 font-bold rounded-lg px-3 py-1.5 text-sm"
          >
            + Ajouter une classe
          </button>
        ) : (
          <form
            onSubmit={handleAddClass}
            className="border-2 border-gray-200 rounded-xl p-4 space-y-3 mt-2"
            noValidate
          >
            <div>
              <label htmlFor="new-class-school" className="block font-semibold mb-1.5 text-sm">
                École
              </label>
              <select
                id="new-class-school"
                required
                value={newClassSchoolId}
                onChange={(e) => {
                  setNewClassSchoolId(e.target.value);
                  setNewClassId("");
                  setCreatingNewClass(false);
                  if (e.target.value) loadClassesForSchool(e.target.value);
                }}
                className="w-full border-2 border-gray-300 rounded-lg p-2.5"
              >
                <option value="">— Choisir une école —</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.city})
                  </option>
                ))}
              </select>
            </div>

            {newClassSchoolId &&
              (creatingNewClass ? (
                <div>
                  <label htmlFor="new-class-name" className="block font-semibold mb-1.5 text-sm">
                    Nom de la classe
                  </label>
                  <input
                    id="new-class-name"
                    required
                    placeholder="ex. CM2 A"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg p-2.5"
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
                  <label htmlFor="new-class-id" className="block font-semibold mb-1.5 text-sm">
                    Classe
                  </label>
                  <select
                    id="new-class-id"
                    required
                    value={newClassId}
                    onChange={(e) => setNewClassId(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg p-2.5"
                  >
                    <option value="">— Choisir une classe —</option>
                    {(classesBySchool[newClassSchoolId] || []).map((c) => (
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
              ))}

            {addClassError && (
              <p role="alert" className="text-red-600 font-bold text-sm">
                {addClassError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={addingClass}
                className="bg-brand-600 text-white font-bold rounded-lg px-4 py-2 disabled:opacity-60"
              >
                {addingClass ? "Ajout…" : "Ajouter cette classe"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddClass(false)}
                className="font-semibold text-sm underline"
              >
                Annuler
              </button>
            </div>
          </form>
        )}
      </div>

      {message && (
        <p role="status" className="mb-4 text-brand-700 font-semibold">
          {message}
        </p>
      )}

      {!loading && classOptions.length > 0 && rows.length === 0 && (
        <p className="text-gray-600">Aucun élève rattaché à cette classe pour le moment.</p>
      )}

      <div className="space-y-4">
        {rows.map((row) => (
          <div
            key={row.child.id}
            className="border-2 border-gray-200 rounded-xl p-5"
          >
            <h2 className="text-lg font-bold mb-3">{row.child.full_name}</h2>

            <div className="mb-4">
              <p className="font-semibold mb-2 text-sm">Présence aujourd&apos;hui</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={savingId === row.child.id}
                  onClick={() => markAttendance(row.child.id, true)}
                  aria-label={`Présent : ${row.child.full_name}`}
                  className={`rounded-lg px-4 py-2 font-semibold border-2 ${
                    row.presentToday === true
                      ? "bg-brand-600 text-white border-brand-600"
                      : "border-gray-300"
                  }`}
                >
                  <span aria-hidden="true">✅</span> Présent
                </button>
                <button
                  type="button"
                  disabled={savingId === row.child.id}
                  onClick={() => markAttendance(row.child.id, false)}
                  aria-label={`Absent : ${row.child.full_name}`}
                  className={`rounded-lg px-4 py-2 font-semibold border-2 ${
                    row.presentToday === false
                      ? "bg-red-600 text-white border-red-600"
                      : "border-gray-300"
                  }`}
                >
                  <span aria-hidden="true">❌</span> Absent
                </button>
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2 text-sm">Ajouter une note (/20)</p>
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  placeholder="Matière"
                  aria-label={`Matière : ${row.child.full_name}`}
                  value={row.subject}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r) =>
                        r.child.id === row.child.id
                          ? { ...r, subject: e.target.value }
                          : r
                      )
                    )
                  }
                  className="border-2 border-gray-300 rounded-lg p-2 flex-1 min-w-[140px]"
                />
                <input
                  type="number"
                  min={0}
                  max={20}
                  step={0.5}
                  placeholder="Note"
                  aria-label={`Note : ${row.child.full_name}`}
                  value={row.score}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r) =>
                        r.child.id === row.child.id
                          ? { ...r, score: e.target.value }
                          : r
                      )
                    )
                  }
                  className="border-2 border-gray-300 rounded-lg p-2 w-24"
                />
                <button
                  type="button"
                  disabled={savingId === row.child.id || !row.subject || !row.score}
                  onClick={() => saveGrade(row.child.id)}
                  aria-label={`Enregistrer la note : ${row.child.full_name}`}
                  className="bg-brand-600 text-white font-semibold rounded-lg px-4 py-2 disabled:opacity-50"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
