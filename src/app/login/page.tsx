"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError("E-mail ou mot de passe incorrect.");
      return;
    }
    router.push("/feed");
  }

  return (
    <main id="contenu-principal" className="max-w-md mx-auto px-4 py-10 bg-bg min-h-screen">
      <Link href="/" className="text-brand-700 font-bold underline">
        ← Accueil
      </Link>
      <h1 className="text-2xl font-bold font-serif mt-3 mb-6">Se connecter</h1>
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="email" className="block font-bold mb-1.5 text-sm">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            placeholder="ex. nom@email.com"
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
            placeholder="Ton mot de passe"
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
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
      <p className="mt-4 text-center">
        Pas encore de compte ?{" "}
        <Link href="/" className="text-brand-700 font-bold underline">
          Inscris-toi
        </Link>
      </p>
    </main>
  );
}
