"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Post, Profile, ROLE_LABELS } from "@/lib/types";
import PostCard from "@/components/PostCard";

const CACHE_KEY = "edutech-benin-feed-cache";

export default function FeedPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
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

      // Filtre : mes posts nationaux + ceux de mon école + ceux de ma classe
      let query = supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      const orFilters = ["scope.eq.national"];
      if (p.school_id) orFilters.push(`school_id.eq.${p.school_id}`);
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
        // On ne garde, côté classe, que celles de l'élève (les posts "school" et "national" passent tous)
        const filtered = (data as Post[]).filter(
          (post) =>
            post.scope !== "class" || post.class_id === p.class_id
        );
        setPosts(filtered);
        localStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
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
      className={`min-h-screen ${highContrast ? "bg-black text-yellow-300" : "bg-bg"}`}
    >
      <header className="border-b-2 border-border px-4 py-4 flex flex-wrap items-center justify-between gap-3 bg-surface">
        <div>
          <Link href="/" className="text-lg font-bold font-serif text-inherit no-underline">
            Écho
          </Link>
          {profile && (
            <p className="text-sm text-muted m-0 mt-0.5">
              {profile.full_name} · {ROLE_LABELS[profile.role]}
            </p>
          )}
        </div>
        <nav className="flex flex-wrap gap-2 items-center">
          <Link
            href="/ecosystem"
            className="font-bold text-sm rounded-lg px-3.5 py-2 border-2 border-border bg-surface text-ink no-underline"
          >
            Autres plateformes
          </Link>
          {canPublish && (
            <Link
              href="/publish"
              className="bg-brand-600 text-brand-ink font-bold text-sm rounded-lg px-3.5 py-2 border-2 border-brand-600 no-underline"
            >
              + Publier
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="border-2 border-border rounded-lg px-3.5 py-2 font-bold text-sm bg-surface text-ink"
          >
            Déconnexion
          </button>
        </nav>
      </header>

      <div className="px-4 py-2.5 flex flex-wrap gap-2.5 border-b border-border bg-surface">
        <button
          onClick={() => setLargeText((v) => !v)}
          aria-pressed={largeText}
          className={`border-2 rounded-lg px-3 py-1.5 font-bold text-sm ${
            largeText
              ? "border-brand-600 bg-brand-50 text-brand-700"
              : "border-border bg-surface text-ink"
          }`}
        >
          {largeText ? "A− Taille normale" : "A+ Agrandir le texte"}
        </button>
        <button
          onClick={() => setHighContrast((v) => !v)}
          aria-pressed={highContrast}
          className={`border-2 rounded-lg px-3 py-1.5 font-bold text-sm ${
            highContrast
              ? "border-brand-600 bg-brand-50 text-brand-700"
              : "border-border bg-surface text-ink"
          }`}
        >
          {highContrast ? "Contraste normal" : "Contraste élevé"}
        </button>
      </div>

      {offline && (
        <p
          role="status"
          className="bg-amber-bg text-amber-text text-center py-2 font-bold m-0 text-sm"
        >
          Hors ligne : tu vois les derniers messages enregistrés sur cet
          appareil.
        </p>
      )}

      <div
        className={`max-w-2xl mx-auto px-4 py-6 space-y-3.5 ${
          largeText ? "text-xl" : ""
        }`}
      >
        {loading && <p>Chargement…</p>}
        {!loading && posts.length === 0 && (
          <p className="text-muted">
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
