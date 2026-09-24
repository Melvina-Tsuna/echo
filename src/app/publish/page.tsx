"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  CATEGORY_LABELS,
  Category,
  Profile,
  Scope,
  SCOPE_LABELS,
} from "@/lib/types";

export default function PublishPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<Category>("info");
  const [scope, setScope] = useState<Scope>("class");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

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

      if (!profileData || profileData.role === "parent") {
        // Les parents ne publient pas, seulement les émetteurs autorisés
        router.push("/feed");
        return;
      }
      setProfile(profileData as Profile);
      // Portée par défaut selon le rôle
      if (profileData.role === "school") setScope("school");
      if (profileData.role === "structure") setScope("national");
      if (profileData.role === "teacher") setScope("class");
      setChecking(false);
    }
    load();
  }, [router]);

  const allowedScopes: Scope[] =
    profile?.role === "teacher"
      ? ["class"]
      : profile?.role === "school"
      ? ["class", "school"]
      : ["national"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setLoading(true);

    let audio_url: string | null = null;
    if (audioFile) {
      const filePath = `${profile.id}/${Date.now()}-${audioFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("post-audio")
        .upload(filePath, audioFile);
      if (uploadError) {
        setError(
          "Le texte sera publié, mais l'audio n'a pas pu être envoyé : " +
            uploadError.message
        );
      } else {
        const { data: publicUrl } = supabase.storage
          .from("post-audio")
          .getPublicUrl(filePath);
        audio_url = publicUrl.publicUrl;
      }
    }

    const { error: insertError } = await supabase.from("posts").insert({
      author_id: profile.id,
      scope,
      school_id: scope !== "national" ? profile.school_id : null,
      class_id: scope === "class" ? profile.class_id : null,
      category,
      title,
      body,
      audio_url,
    });

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSuccess(true);
    setTitle("");
    setBody("");
    setAudioFile(null);
  }

  if (checking) {
    return (
      <main className="max-w-xl mx-auto px-4 py-10 bg-bg min-h-screen">
        <p>Vérification…</p>
      </main>
    );
  }

  return (
    <main id="contenu-principal" className="max-w-xl mx-auto px-4 py-10 bg-bg min-h-screen">
      <Link href="/feed" className="text-brand-700 font-bold underline">
        ← Retour au fil
      </Link>
      <h1 className="text-2xl font-bold font-serif mt-3 mb-1">Publier une information</h1>
      <p className="text-muted mb-6">
        Ton message sera automatiquement présenté en texte, en audio et avec
        un pictogramme, pour être accessible à tous.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <fieldset>
          <legend className="font-bold mb-2 text-sm">Portée du message</legend>
          <div className="flex flex-wrap gap-2.5">
            {allowedScopes.map((s) => (
              <label
                key={s}
                className={`border-2 rounded-[10px] px-4 py-2 cursor-pointer font-bold text-sm ${
                  scope === s
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-border bg-surface text-ink"
                }`}
              >
                <input
                  type="radio"
                  name="scope"
                  value={s}
                  checked={scope === s}
                  onChange={() => setScope(s)}
                  className="sr-only"
                />
                {SCOPE_LABELS[s]}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="category" className="block font-bold mb-1.5 text-sm">
            Catégorie
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full border-2 border-border bg-surface text-ink rounded-[10px] p-3 text-lg"
          >
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c].icon} {CATEGORY_LABELS[c].label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="title" className="block font-bold mb-1.5 text-sm">
            Titre
          </label>
          <input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border-2 border-border bg-surface text-ink rounded-[10px] p-3 text-lg"
          />
        </div>

        <div>
          <label htmlFor="body" className="block font-bold mb-1.5 text-sm">
            Message (phrases courtes et simples)
          </label>
          <textarea
            id="body"
            required
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full border-2 border-border bg-surface text-ink rounded-[10px] p-3 text-lg"
          />
        </div>

        <div>
          <label htmlFor="audio" className="block font-bold mb-1.5 text-sm">
            Note vocale (optionnel — en langue locale si possible)
          </label>
          <input
            id="audio"
            type="file"
            accept="audio/*"
            onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
            className="w-full border-2 border-border bg-surface text-ink rounded-[10px] p-2"
          />
          <p className="text-sm text-muted mt-1">
            Sans note vocale, le message sera lu automatiquement en français
            par synthèse vocale.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-danger font-bold">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="text-brand-700 font-bold">
            Publié avec succès.
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 text-brand-ink font-bold text-lg rounded-[10px] py-3 disabled:opacity-60"
        >
          {loading ? "Publication…" : "Publier"}
        </button>
      </form>
    </main>
  );
}
