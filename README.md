# Planning familial — Saint François Longchamps

Application web (Next.js + Tailwind + Supabase) pour réserver l'appartement en famille.
Base technique reprise de l'application Plombelec (connexion Supabase par invitation, comptes à activer, règles appliquées par la base).

## Écrans

| Adresse | Pour qui | Contenu |
|---|---|---|
| `/` | Tous les membres actifs | Planning annuel : semaines regroupées par mois, chacune avec sa semaine (lundi → vendredi) et son week-end (samedi → dimanche). Flèches pour changer d'année, liste de toutes les réservations de l'année en bas. |
| `/membres` | Administrateurs | Activation des comptes, prénom / nom, rôle |
| `/journal` | Administrateurs | Journal des modifications : date, heure, personne, réservation ou membre ajouté, modifié ou supprimé (avec le détail avant → après) |
| `/login`, `/en-attente` | — | Connexion ; page affichée tant qu'un compte n'est pas activé |

## Rôles

- **Administrateur** : réserve une semaine, un week-end ou des dates libres (« Autres dates »), modifie et supprime les réservations, gère les membres.
- **Lecteur** : consulte le planning et le détail des réservations, sans rien modifier.

Les droits sont vérifiés par la base (Row Level Security), pas seulement par l'écran.

## Règles appliquées par la base

- Une réservation occupe les jours du premier au dernier, tous deux inclus : la semaine (lundi → vendredi) et le week-end (samedi → dimanche) se réservent séparément.
- **Aucun chevauchement** possible entre deux réservations (contrainte d'exclusion PostgreSQL), même saisies en même temps.
- Occupant obligatoire, 62 jours au maximum.
- Tout nouveau compte est **inactif** et ne voit rien tant qu'un administrateur ne l'a pas activé.
- Chaque ajout, modification ou suppression de réservation ou de membre est inscrit au **journal** par la base ; il est lisible par les administrateurs et ne peut être ni modifié ni effacé depuis l'application.
- Il reste toujours **au moins un administrateur actif** (impossible de se rétrograder si on est le dernier).

## Mise en route

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, exécuter les fichiers de `supabase/migrations/` dans l'ordre (ou `supabase db push`).
3. Dans **Authentication > Sign In / Providers**, désactiver « Allow new users to sign up » : les comptes se créent par invitation (**Authentication > Users > Invite user**).
4. S'inviter soi-même, puis se passer administrateur dans le SQL Editor :
   ```sql
   UPDATE membres SET actif = true, role = 'ADMINISTRATEUR', prenom = 'Prénom', nom = 'Nom'
   WHERE email = 'vous@exemple.fr';
   ```
   Les membres suivants s'activent depuis `/membres`.

   Pour un compte à **identifiant simple** (sans email, ex. `mathieufabre`) : créer l'utilisateur dans
   **Authentication > Users > Add user** avec l'email `mathieufabre@longchamps.local`, cocher « Auto Confirm User » ;
   on se connecte ensuite en tapant juste `mathieufabre`.
5. Copier `.env.example` en `.env.local` et renseigner l'URL et la clé `anon` (**Project Settings > API**).
6. `npm install` puis `npm run dev` et ouvrir http://localhost:3000.

Déploiement : comme Plombelec, sur Vercel avec les deux variables `NEXT_PUBLIC_SUPABASE_*`.

## Tests

```bash
npm test                         # découpage de l'année (lundi → vendredi, samedi → dimanche), chevauchements
supabase/tests/lancer_tests.sh   # règles de la base sur un PostgreSQL 15+ local jetable : « TOUS LES SCÉNARIOS PASSENT »
```
