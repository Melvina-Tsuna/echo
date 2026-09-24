# Écho

**Le lien accessible entre écoles et familles.**

Projet Education.

## Le besoin identifié

L'information scolaire (devoirs, réunions, fermetures, bourses) est publiée
une fois par un enseignant/une école/une structure, mais n'atteint réellement
qu'une partie des familles : celles qui lisent le français, qui voient, qui
entendent, et qui ont du réseau. **Écho résout ce dernier kilomètre
de l'information** : chaque message est automatiquement proposé en texte
simplifié, en audio (note vocale humaine ou synthèse vocale) et avec un
pictogramme, et reste consultable hors ligne.

La plateforme ne remplace pas les outils existants mais les complète, et
les référencie dans la page **Autres plateformes**.

## Fonctionnement

Trois niveaux de diffusion, une seule mécanique de publication :

- **Enseignant** → publie pour sa classe (devoir, note, réunion)
- **École** → publie pour toutes les familles de l'établissement (fermeture,
  événement, sécurité)
- **Structure** (ministère, ONG) → publie à l'échelle nationale/régionale
  (bourse, examen national, campagne)

Chaque famille (rôle **Parent/Élève**) voit un fil filtré : les messages de
sa classe, de son école, et les messages nationaux.

## Accessibilité

- Texte toujours présent (jamais d'info uniquement audio) → accessible aux
  personnes sourdes et aux lecteurs d'écran.
- Bouton d'écoute sur chaque message : lit une note vocale humaine si elle
  existe, sinon utilise la synthèse vocale du navigateur → accessible aux
  personnes malvoyantes et peu/pas alphabétisées.
- Pictogramme par catégorie (devoir, examen, réunion, bourse, urgence, info).
- Mode texte agrandi et contraste élevé, activables en un clic.
- Navigation clavier complète, lien d'évitement, attributs ARIA.
- PWA avec mise en cache : les derniers messages restent lisibles hors ligne.

## Stack

- **Next.js 14** (App Router, TypeScript) + **Tailwind CSS**
- **Supabase** : authentification, base de données Postgres, stockage des
  notes vocales
- Déploiement : **Vercel**

## Mise en route

### 1. Créer le projet Supabase

1. Sur [supabase.com](https://supabase.com), crée un nouveau projet.
2. Dans **SQL Editor**, exécute `supabase/schema.sql` (tables, sécurité,
   bucket de stockage).
3. Crée manuellement quelques écoles, classes et liens d'écosystème dans les
   tables `schools`, `classes` et `ecosystem_links` (ou via l'interface
   Supabase Table Editor).
4. Dans **Project Settings → API**, récupère `Project URL` et la clé `anon`.

### 2. Configurer le projet local

```bash
cp .env.example .env.local
# renseigne NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

## Structure du projet

```
src/
  app/
    page.tsx          accueil
    login/ signup/     authentification
    feed/              fil d'actualité accessible (récepteur)
    publish/           publication (émetteur : enseignant/école/structure)
    ecosystem/         redirections vers les plateformes existantes
  components/
    PostCard.tsx        carte de publication accessible
    AudioButton.tsx      lecture audio (fichier ou synthèse vocale)
    ServiceWorkerRegister.tsx
  lib/
    supabaseClient.ts
    types.ts
supabase/
  schema.sql            tables, RLS, stockage
public/
  manifest.json, sw.js   PWA et cache hors ligne
```
