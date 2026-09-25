"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Alert, ALERT_LABELS, Child, Post, Profile, ROLE_LABELS } from "@/lib/types";
import PostCard from "@/components/PostCard";
import AudioButton from "@/components/AudioButton";

const CACHE_KEY = "edutech-benin-feed-cache";

export default function FeedPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

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

      if (!profileData) {
        router.push("/login");
        return;
      }
      const p = profileData as Profile;
      setProfile(p);

      // Pour un parent, le périmètre (écoles/classes) dépend de TOUS ses enfants.
      let children: Child[] = [];
      if (p.role === "parent") {
        const { data: childrenData } = await supabase
          .from("children")
          .select("*")
          .eq("parent_id", p.id);
        children = (childrenData || []) as Child[];
      }

      const schoolIds = p.role === "parent"
        ? [...new Set(children.map((c) => c.school_id).filter(Boolean))]
        : p.school_id
          ? [p.school_id]
          : [];
      const classIds = children.map((c) => c.class_id).filter(Boolean) as string[];

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
      if (p.role === "parent" && children.length > 0) {
        const { data: alertData } = await supabase
          .from("alerts")
          .select("*")
          .in("student_id", children.map((c) => c.id))
          .order("created_at", { ascending: false });
        setAlerts((alertData || []) as Alert[]);
      }

      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const canPublish =
    profile?.role === "teacher" ||
    profile?.role === "school" ||
    profile?.role === "structure";

  return (
    <main
      id="contenu-principal"
      className={`min-h-screen ${highContrast ? "bg-black text-yellow-300" : "bg-gray-50"}`}
    >
      <header className="border-b-2 border-gray-200 px-4 py-4 flex flex-wrap items-center justify-between gap-3 bg-white">
        <div>
          <h1 className="text-xl font-bold">Écho</h1>
          {profile && (
            <p className="text-sm text-gray-600">
              {profile.full_name} · {ROLE_LABELS[profile.role]}
            </p>
          )}
        </div>
        <nav className="flex flex-wrap gap-2 items-center">
          <Link
            href="/ecosystem"
            className="text-brand-700 font-semibold underline"
          >
            Autres plateformes
          </Link>
          {canPublish && (
            <Link
              href="/publish"
              className="bg-brand-600 text-white font-semibold rounded-lg px-4 py-2"
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
          <button
            onClick={handleLogout}
            className="border-2 border-gray-300 rounded-lg px-4 py-2"
          >
            Déconnexion
          </button>
        </nav>
      </header>

      <div className="px-4 py-3 flex flex-wrap gap-3 border-b border-gray-200 bg-white">
        <button
          onClick={() => setLargeText((v) => !v)}
          aria-pressed={largeText}
          className="border-2 border-gray-300 rounded-lg px-3 py-2 font-semibold"
        >
          {largeText ? "A− Taille normale" : "A+ Agrandir le texte"}
        </button>
        <button
          onClick={() => setHighContrast((v) => !v)}
          aria-pressed={highContrast}
          className="border-2 border-gray-300 rounded-lg px-3 py-2 font-semibold"
        >
          {highContrast ? "Contraste normal" : "Contraste élevé"}
        </button>
      </div>

      {offline && (
        <p
          role="status"
          className="bg-amber-100 text-amber-900 text-center py-2 font-semibold"
        >
          Hors ligne : tu vois les derniers messages enregistrés sur cet
          appareil.
        </p>
      )}

      <div
        className={`max-w-2xl mx-auto px-4 py-6 space-y-4 ${
          largeText ? "text-xl" : ""
        }`}
      >
        {loading && <p>Chargement…</p>}

        {!loading && alerts.length > 0 && (
          <div className="space-y-3" role="alert">
            {alerts.map((alert) => (
              <article
                key={alert.id}
                className="rounded-xl border-2 border-red-400 bg-red-50 p-5"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl" aria-hidden="true">
                    {ALERT_LABELS[alert.type].icon}
                  </span>
                  <p className="text-sm font-bold text-red-700 uppercase tracking-wide">
                    Alerte de suivi · {ALERT_LABELS[alert.type].label}
                  </p>
                </div>
                <p className="big-text mb-4">{alert.message}</p>
                <AudioButton text={`Alerte. ${alert.message}`} />
              </article>
            ))}
          </div>
        )}

        {!loading && posts.length === 0 && alerts.length === 0 && (
          <p className="text-gray-600">
            Aucun message pour le moment. Reviens plus tard.
          </p>
        )}
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </main>
  );
}
