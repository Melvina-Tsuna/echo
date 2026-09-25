"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function SignupStructurePage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
      role: "structure",
      school_id: null,
      class_id: null,
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
      <h1 className="text-2xl font-bold font-serif mt-3 mb-1">
        Créer un compte Structure
      </h1>
      <p className="text-ink mb-6">
        Pour un ministère, une ONG ou toute structure publiant à l&apos;échelle
        nationale ou régionale.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="fullName" className="block font-bold mb-1.5 text-sm">
            Nom de la structure
          </label>
          <input
            id="fullName"
            required
            placeholder="ex. Ministère de l'Éducation"
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
            placeholder="ex. contact@structure.bj"
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
