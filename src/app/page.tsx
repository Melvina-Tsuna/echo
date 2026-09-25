import Link from "next/link";

export default function HomePage() {
  return (
    <main id="contenu-principal" className="min-h-screen flex flex-col">
      <section className="flex-1 flex flex-col items-center justify-center text-center gap-6 px-4 py-16 bg-brand-50">
        <h1 className="text-[clamp(2rem,6vw,2.7rem)] font-bold text-brand-700 m-0">
          Écho
        </h1>
        <p className="max-w-[480px] text-[1.15rem] text-ink m-0">
          Le lien entre les écoles et les familles. Chaque message est
          proposé en texte clair, en audio et avec des pictogrammes: même
          sans connexion internet.
        </p>

        <div className="w-full max-w-[480px]">
          <p className="font-bold mb-3 text-ink">Je crée un compte en tant que…</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              href="/signup/famille"
              className="flex flex-col items-center gap-2 bg-brand-600 text-brand-ink font-bold rounded-[10px] px-4 py-5"
            >
              <span aria-hidden="true" className="text-3xl">
                👪
              </span>
              Famille
            </Link>
            <Link
              href="/signup/etablissement"
              className="flex flex-col items-center gap-2 bg-brand-600 text-brand-ink font-bold rounded-[10px] px-4 py-5"
            >
              <span aria-hidden="true" className="text-3xl">
                🏫
              </span>
              Établissement
            </Link>
            <Link
              href="/signup/structure"
              className="flex flex-col items-center gap-2 bg-brand-600 text-brand-ink font-bold rounded-[10px] px-4 py-5"
            >
              <span aria-hidden="true" className="text-3xl">
                🏛️
              </span>
              Structure
            </Link>
          </div>
        </div>

        <Link
          href="/login"
          className="border-2 border-brand-600 text-brand-700 font-bold rounded-[10px] px-7 py-3.5"
        >
          J&apos;ai déjà un compte, me connecter
        </Link>

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
