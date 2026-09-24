import Link from "next/link";

export default function HomePage() {
  return (
    <main id="contenu-principal" className="min-h-screen flex flex-col">
      <section className="flex-1 flex flex-col items-center justify-center text-center gap-5 px-4 py-16 bg-brand-50">
        <h1 className="text-[clamp(2rem,6vw,2.7rem)] font-bold text-brand-700 m-0">
          Écho
        </h1>
        <p className="max-w-[480px] text-[1.15rem] text-ink m-0">
          Le lien entre les écoles et les familles. Chaque message est
          proposé en texte clair, en audio et avec des pictogrammes: même
          sans connexion internet.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/signup"
            className="bg-brand-600 text-brand-ink font-bold rounded-[10px] px-7 py-3.5"
          >
            Créer un compte
          </Link>
          <Link
            href="/login"
            className="border-2 border-brand-600 text-brand-700 font-bold rounded-[10px] px-7 py-3.5"
          >
            Se connecter
          </Link>
        </div>
        <Link
          href="/ecosystem"
          className="text-brand-700 underline font-semibold text-[0.95rem]"
        >
          Voir les autres plateformes d&apos;éducation au Bénin
        </Link>
      </section>
    </main>
  );
}
