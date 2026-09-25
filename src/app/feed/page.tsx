"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  Alert,
  ALERT_LABELS,
  Child,
  Post,
  Profile,
  ROLE_LABELS,
  School,
  SchoolClass,
  SCHOOL_TYPE_LABELS,
  ZONE_LABELS,
} from "@/lib/types";
import PostCard from "@/components/PostCard";
import AudioButton from "@/components/AudioButton";
import BeninFlag from "@/components/BeninFlag";
import PushOptIn from "@/components/PushOptIn";

const CACHE_KEY = "edutech-benin-feed-cache";

export default function FeedPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const [schools, setSchools] = useState<School[]>([]);
  const [classesBySchool, setClassesBySchool] = useState<
    Record<string, SchoolClass[]>
  >({});
  const [childClasses, setChildClasses] = useState<SchoolClass[]>([]);
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildSchoolId, setNewChildSchoolId] = useState("");
  const [newChildClassId, setNewChildClassId] = useState("");
  const [addChildError, setAddChildError] = useState<string | null>(null);
  const [addingChild, setAddingChild] = useState(false);

  const childNameByClassId: Record<string, string> = {};
  if (children.length > 1) {
    children.forEach((c) => {
      if (c.class_id) childNameByClassId[c.class_id] = c.full_name;
    });
  }

  const schoolNameById: Record<string, string> = {};
  schools.forEach((s) => {
    schoolNameById[s.id] = s.name;
  });
  const classNameById: Record<string, string> = {};
  childClasses.forEach((c) => {
    classNameById[c.id] = c.name;
  });

  const loadFeed = useCallback(async () => {
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

    if (!profileData) {
      router.push("/login");
      return;
    }
    const p = profileData as Profile;
    setProfile(p);

    // Pour un parent, le périmètre (écoles/classes) dépend de TOUS ses enfants.
    let currentChildren: Child[] = [];
    if (p.role === "parent") {
      const { data: childrenData } = await supabase
        .from("children")
        .select("*")
        .eq("parent_id", p.id)
        .order("full_name");
      currentChildren = (childrenData || []) as Child[];
      setChildren(currentChildren);
    }

    const schoolIds =
      p.role === "parent"
        ? [...new Set(currentChildren.map((c) => c.school_id).filter(Boolean))]
        : p.school_id
          ? [p.school_id]
          : [];
    const classIds = currentChildren
      .map((c) => c.class_id)
      .filter(Boolean) as string[];

    if (p.role === "parent" && classIds.length > 0) {
      const { data: classesData } = await supabase
        .from("classes")
        .select("*")
        .in("id", classIds);
      setChildClasses((classesData || []) as SchoolClass[]);
    }

    // Filtre : mes posts nationaux + ceux de mes écoles + ceux de mes classes
    let query = supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    const orFilters = ["scope.eq.national"];
    schoolIds.forEach((id) => orFilters.push(`school_id.eq.${id}`));
    query = query.or(orFilters.join(","));

    const { data, error } = await query;

    if (error || !data) {
      // Hors ligne ou erreur réseau : on retombe sur le cache local
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        setPosts(JSON.parse(cached));
        setOffline(true);
      }
    } else {
      setOffline(false);
      // On ne garde, côté classe, que celles d'une classe d'un des enfants
      // (les posts "school" et "national" passent tous)
      const filtered = (data as Post[]).filter(
        (post) =>
          post.scope !== "class" ||
          (p.role === "parent"
            ? classIds.includes(post.class_id || "")
            : post.class_id === p.class_id)
      );
      setPosts(filtered);
      localStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
    }

    // Alertes de suivi (absentéisme / chute de notes) : pour tous les enfants du parent
    if (p.role === "parent" && currentChildren.length > 0) {
      const { data: alertData } = await supabase
        .from("alerts")
        .select("*")
        .in(
          "student_id",
          currentChildren.map((c) => c.id)
        )
        .order("created_at", { ascending: false });
      setAlerts((alertData || []) as Alert[]);
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (profile?.role === "parent" && schools.length === 0) {
      supabase
        .from("schools")
        .select("*")
        .order("name")
        .then(({ data }) => setSchools(data || []));
    }
  }, [profile, schools.length]);

  async function loadClassesForSchool(schoolId: string) {
    if (classesBySchool[schoolId]) return;
    const { data } = await supabase
      .from("classes")
      .select("*")
      .eq("school_id", schoolId)
      .order("name");
    setClassesBySchool((prev) => ({ ...prev, [schoolId]: data || [] }));
  }

  async function handleAddChild(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setAddChildError(null);

    if (!newChildName || !newChildSchoolId || !newChildClassId) {
      setAddChildError("Merci de renseigner le nom, l'école et la classe.");
      return;
    }

    setAddingChild(true);
    const { error } = await supabase.from("children").insert({
      parent_id: profile.id,
      full_name: newChildName,
      school_id: newChildSchoolId,
      class_id: newChildClassId,
    });
    setAddingChild(false);

    if (error) {
      setAddChildError(error.message);
      return;
    }

    setNewChildName("");
    setNewChildSchoolId("");
    setNewChildClassId("");
    setShowAddChild(false);
    setLoading(true);
    await loadFeed();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const canPublish =
    profile?.role === "teacher" ||
    profile?.role === "school" ||
    profile?.role === "structure";

  return (
    <main id="contenu-principal" className="min-h-screen bg-bg text-ink">
      <header className="border-b-2 border-border px-4 py-4 flex flex-wrap items-center justify-between gap-3 bg-surface">
        <div>
          <h1 className="text-xl font-bold text-brand-700">Écho</h1>
          {profile && (
            <p className="text-sm text-muted">
              {profile.full_name} · {ROLE_LABELS[profile.role]}
            </p>
          )}
        </div>
        <nav className="flex flex-wrap gap-2 items-center">
          <Link
            href="/ecosystem"
            className="flex items-center gap-1.5 border-2 border-brand-600 text-brand-700 font-semibold rounded-lg px-4 py-2"
          >
            <BeninFlag />
            Autres plateformes
          </Link>
          {canPublish && (
            <Link
              href="/publish"
              className="bg-brand-600 text-brand-ink font-semibold rounded-lg px-4 py-2"
            >
              + Publier
            </Link>
          )}
          {profile?.role === "teacher" && (
            <Link
              href="/track"
              className="border-2 border-brand-600 text-brand-700 font-semibold rounded-lg px-4 py-2"
            >
              Suivi de classe
            </Link>
          )}
          {profile?.role === "structure" && (
            <Link
              href="/admin/ecoles"
              className="border-2 border-brand-600 text-brand-700 font-semibold rounded-lg px-4 py-2"
            >
              Gérer les écoles
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="border-2 border-border rounded-lg px-4 py-2"
          >
            Déconnexion
          </button>
        </nav>
      </header>

      {offline && (
        <p
          role="status"
          className="bg-amber-bg text-amber-text text-center py-2 font-semibold"
        >
          Hors ligne : tu vois les derniers messages enregistrés sur cet
          appareil.
        </p>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {loading && <p>Chargement…</p>}

        {!loading && profile?.role === "parent" && (
          <PushOptIn parentId={profile.id} />
        )}

        {!loading && profile?.role === "parent" && (
          <section className="rounded-xl border-2 border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="font-bold text-lg m-0">Mes enfants</h2>
              <button
                type="button"
                onClick={() => setShowAddChild((v) => !v)}
                className="shrink-0 whitespace-nowrap border-2 border-brand-600 text-brand-700 font-bold rounded-lg px-3 py-1.5 text-sm"
              >
                {showAddChild ? "Annuler" : "+ Ajouter"}
              </button>
            </div>

            {children.length > 0 && (
              <div className="mb-3">
                <AudioButton
                  label="Écouter la liste"
                  context="Mes enfants"
                  text={children
                    .map((c) => {
                      const schoolName = c.school_id
                        ? schoolNameById[c.school_id]
                        : undefined;
                      const className = c.class_id
                        ? classNameById[c.class_id]
                        : undefined;
                      const details = [schoolName, className]
                        .filter(Boolean)
                        .join(", ");
                      return details
                        ? `${c.full_name}, ${details}.`
                        : `${c.full_name}.`;
                    })
                    .join(" ")}
                />
              </div>
            )}

            {children.length > 0 && (
              <ul className="space-y-2 mb-2">
                {children.map((c) => {
                  const schoolName = c.school_id
                    ? schoolNameById[c.school_id]
                    : undefined;
                  const className = c.class_id
                    ? classNameById[c.class_id]
                    : undefined;
                  return (
                    <li
                      key={c.id}
                      className="flex items-start gap-3 rounded-lg border border-border bg-bg px-3 py-2.5"
                    >
                      <span className="text-xl leading-none shrink-0" aria-hidden="true">
                        🧒
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink m-0">
                          {c.full_name}
                        </p>
                        {(schoolName || className) && (
                          <p className="text-xs text-muted m-0 mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            {schoolName && (
                              <span className="inline-flex items-center gap-1">
                                <span aria-hidden="true">🏫</span> {schoolName}
                              </span>
                            )}
                            {className && (
                              <span className="inline-flex items-center gap-1">
                                <span aria-hidden="true">📚</span> {className}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {showAddChild && (
              <form
                onSubmit={handleAddChild}
                className="space-y-3 mt-3 pt-3 border-t border-border"
                noValidate
              >
                <div>
                  <label
                    htmlFor="new-child-name"
                    className="block font-bold mb-1.5 text-sm"
                  >
                    Nom de l&apos;enfant
                  </label>
                  <input
                    id="new-child-name"
                    required
                    placeholder="ex. Prénom Nom"
                    value={newChildName}
                    onChange={(e) => setNewChildName(e.target.value)}
                    className="w-full border-2 border-border bg-bg text-ink rounded-[10px] p-2.5"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-child-school"
                    className="block font-bold mb-1.5 text-sm"
                  >
                    École
                  </label>
                  <select
                    id="new-child-school"
                    required
                    value={newChildSchoolId}
                    onChange={(e) => {
                      setNewChildSchoolId(e.target.value);
                      setNewChildClassId("");
                      if (e.target.value) loadClassesForSchool(e.target.value);
                    }}
                    className="w-full border-2 border-border bg-bg text-ink rounded-[10px] p-2.5"
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
                {newChildSchoolId && (
                  <div>
                    <label
                      htmlFor="new-child-class"
                      className="block font-bold mb-1.5 text-sm"
                    >
                      Classe
                    </label>
                    <select
                      id="new-child-class"
                      required
                      value={newChildClassId}
                      onChange={(e) => setNewChildClassId(e.target.value)}
                      className="w-full border-2 border-border bg-bg text-ink rounded-[10px] p-2.5"
                    >
                      <option value="">— Choisir une classe —</option>
                      {(classesBySchool[newChildSchoolId] || []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {addChildError && (
                  <p role="alert" className="text-danger font-bold text-sm">
                    {addChildError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={addingChild}
                  className="bg-brand-600 text-brand-ink font-bold rounded-lg px-4 py-2 disabled:opacity-60"
                >
                  {addingChild ? "Ajout…" : "Ajouter cet enfant"}
                </button>
              </form>
            )}
          </section>
        )}

        {!loading && alerts.length > 0 && (
          <div className="space-y-3" role="alert">
            {alerts.map((alert) => (
              <article
                key={alert.id}
                className="rounded-xl border-2 border-danger bg-surface p-5"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl" aria-hidden="true">
                    {ALERT_LABELS[alert.type].icon}
                  </span>
                  <p className="text-sm font-bold text-danger uppercase tracking-wide">
                    Alerte de suivi · {ALERT_LABELS[alert.type].label}
                  </p>
                </div>
                <p className="big-text mb-4">{alert.message}</p>
                <AudioButton
                  text={`Alerte. ${alert.message}`}
                  context={ALERT_LABELS[alert.type].label}
                />
              </article>
            ))}
          </div>
        )}

        {!loading && posts.length === 0 && alerts.length === 0 && (
          <p className="text-muted">
            Aucun message pour le moment. Reviens plus tard.
          </p>
        )}
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            childName={
              post.scope === "class" && post.class_id
                ? childNameByClassId[post.class_id]
                : undefined
            }
          />
        ))}
      </div>
    </main>
  );
}
