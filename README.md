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

Chaque famille (rôle **Parent**) voit un fil filtré : les messages des
classes et écoles de tous ses enfants, et les messages nationaux.

## Parcours d'inscription

L'accueil tranche le rôle dès la première étape avec 3 parcours dédiés,
chacun avec uniquement les champs pertinents :

- **Famille** (`/signup/famille`) : un compte parent peut déclarer
  **plusieurs enfants**, chacun avec sa propre école et sa propre classe
  (utile pour une fratrie répartie dans des établissements différents). Le
  fil et les alertes de suivi agrègent alors tous les enfants du foyer.
- **Établissement** (`/signup/etablissement`) : enseignant (rattaché à une
  classe) ou école (rattachée à un établissement).
- **Structure** (`/signup/structure`) : ministère, ONG — publication
  nationale/régionale, sans école/classe à renseigner.

## Accessibilité

- Texte toujours présent (jamais d'info uniquement audio) → accessible aux
  personnes sourdes et aux lecteurs d'écran.
- Bouton d'écoute sur chaque message : lit une note vocale humaine si elle
  existe, sinon utilise la synthèse vocale du navigateur → accessible aux
  personnes malvoyantes et peu/pas alphabétisées.
- Accueil vocal à l'ouverture du site (`VoiceWelcome`) : un message de
  bienvenue est lu automatiquement via la synthèse vocale **locale** du
  navigateur (voix installées sur l'appareil), donc sans dépendre du réseau.
  Si le navigateur ne supporte pas la synthèse vocale, si aucune voix locale
  n'est disponible, ou si la lecture échoue, le message s'affiche simplement
  à l'écran à la place.
- Pictogramme par catégorie (devoir, examen, réunion, bourse, urgence, info).
- Mode texte agrandi et contraste élevé, activables en un clic.
- Navigation clavier complète, lien d'évitement, attributs ARIA.
- PWA avec mise en cache : les derniers messages restent lisibles hors ligne.

Le handicap visuel est couvert en s'appuyant sur le lecteur d'écran natif du
téléphone (TalkBack, VoiceOver) plutôt qu'en réinventant une brique
propriétaire : chaque bouton a un intitulé visible/`aria-label` explicite
(jamais une icône seule), donc l'app reste pilotable au lecteur d'écran
**entièrement hors ligne**, sans dépendre d'un service de reconnaissance
vocale. Le handicap auditif est couvert par le texte systématiquement
présent (aucune information n'est disponible uniquement en audio).

### Pistes d'amélioration (non retenues pour le MVP)

- **Navigation par commande vocale** (dire "Famille" pour valider le bouton
  correspondant) : rejetée pour l'instant car l'API `SpeechRecognition` du
  navigateur envoie l'audio à un serveur distant (Google) pour le
  reconnaître — elle ne fonctionne donc pas hors ligne, contrairement à la
  synthèse vocale (`speechSynthesis`) qui est locale. Une vraie
  reconnaissance vocale hors ligne nécessiterait d'embarquer un modèle en
  local dans le navigateur (ex. Vosk ou whisper.cpp compilés en WebAssembly),
  ce qui représente plusieurs dizaines de Mo à télécharger et une intégration
  plus lourde à explorer après le MVP.

## Stack

- **Next.js 14** (App Router, TypeScript) + **Tailwind CSS**
- **Supabase** : authentification, base de données Postgres, stockage des
  notes vocales
- Déploiement : **Vercel**

## Mise en route

### 1. Créer le projet Supabase

1. Sur [supabase.com](https://supabase.com), crée un nouveau projet.
2. Dans **SQL Editor**, exécute dans l'ordre `supabase/schema.sql` (tables,
   sécurité, bucket de stockage), puis `supabase/migration_children.sql`
   (table `children` pour le multi-enfants — voir plus bas), puis
   `supabase/migration_presence.sql` si le suivi de classe est utilisé.
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
    page.tsx                    accueil (choix du rôle)
    login/                       authentification
    signup/
      famille/                   inscription famille (multi-enfants)
      etablissement/              inscription enseignant/école
      structure/                  inscription structure
    feed/                        fil d'actualité accessible (récepteur)
    publish/                     publication (émetteur : enseignant/école/structure)
    track/                       suivi de classe (présences/notes, enseignant)
    ecosystem/                   redirections vers les plateformes existantes
  components/
    PostCard.tsx        carte de publication accessible
    AudioButton.tsx      lecture audio (fichier ou synthèse vocale)
    VoiceWelcome.tsx      accueil vocal à l'ouverture (avec repli texte)
    ServiceWorkerRegister.tsx
  lib/
    supabaseClient.ts
    types.ts
supabase/
  schema.sql                  tables, RLS, stockage
  migration_children.sql      table `children` (multi-enfants par famille)
  migration_presence.sql      suivi présence/notes + alertes automatiques
public/
  manifest.json, sw.js   PWA et cache hors ligne
```
