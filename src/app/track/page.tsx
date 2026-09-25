"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Child, Profile } from "@/lib/types";

interface StudentRow {
  child: Child;
  presentToday: boolean | null; // null = pas encore saisi aujourd'hui
  subject: string;
  score: string;
}

const TODAY = new Date().toISOString().slice(0, 10);

export default function TrackPage() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<Profile | null>(null);
  const [rows, setRows] = useState<StudentRow[]>([]);
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

      if (!profileData || profileData.role !== "teacher" || !profileData.class_id) {
        router.push("/feed");
        return;
      }
      setTeacher(profileData as Profile);

      const { data: students } = await supabase
        .from("children")
        .select("*")
        .eq("class_id", profileData.class_id)
        .order("full_name");

      const { data: todayAttendance } = await supabase
        .from("attendance")
        .select("student_id, present")
        .eq("class_id", profileData.class_id)
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
    }
    load();
  }, [router]);

  async function markAttendance(studentId: string, present: boolean) {
    if (!teacher) return;
    setSavingId(studentId);
    const { error } = await supabase.from("attendance").upsert(
      {
        student_id: studentId,
        class_id: teacher.class_id,
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
    if (!teacher) return;
    const row = rows.find((r) => r.child.id === studentId);
    if (!row || !row.subject || !row.score) return;

    setSavingId(studentId);
    const { error } = await supabase.from("grades").insert({
      student_id: studentId,
      class_id: teacher.class_id,
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

  if (loading) {
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

      {message && (
        <p role="status" className="mb-4 text-brand-700 font-semibold">
          {message}
        </p>
      )}

      {rows.length === 0 && (
        <p className="text-gray-600">Aucun élève rattaché à ta classe pour le moment.</p>
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
