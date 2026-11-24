# LocaGest — V1 (sprints 1 et 2)

Application de gestion locative et financière : **API Laravel 12** (`locagest-api`) + **frontend Next.js** (`locagest-web`).

## Lancer le projet en local

Prérequis : PHP 8.2+, Composer, Node 20+, MySQL (XAMPP).

```bash
# 1. API (port 8000) — base MySQL « locagest »
cd locagest-api
composer install
cp .env.example .env && php artisan key:generate   # première fois seulement
# créer la base vide « locagest » dans phpMyAdmin (utf8mb4)
php artisan migrate:fresh --seed                   # tables + catégories + données de démo
php artisan serve --host=localhost --port=8000

# 2. Frontend (port 3000)
cd locagest-web
npm install
cp .env.example .env.local
npm run dev
```

Ouvrir **http://localhost:3000** (utiliser `localhost` partout, pas `127.0.0.1` : les cookies de session sont liés au domaine).

Compte de démonstration : `proprietaire@locagest.test` / `password`.

Les e-mails (invitations, mot de passe oublié) sont écrits dans `locagest-api/storage/logs/laravel.log` en développement (`MAIL_MAILER=log`). En local, le lien d'invitation s'affiche aussi directement sur la fiche du locataire.

## Tâches planifiées (cahier des charges §6)

```bash
php artisan schedule:work          # en développement
php artisan invoices:generate      # à la main : factures du mois (sans doublon)
php artisan invoices:mark-late     # à la main : retards + pénalités
```

## Tests

```bash
cd locagest-api && php artisan test     # 37 tests : règles de gestion et scénarios de recette
```

## Ce qui est livré

| Sprint | Tâche | Contenu |
|---|---|---|
| 1 | A | Modèle de données (§5), contrat d'API (`locagest-api/docs/CONTRAT_API.md`) |
| 1 | B — Lot 1 | Inscription particulier / société, connexion Sanctum SPA, mot de passe oublié, profil, rôles, redirections |
| 1 | C — Lot 2 | Biens, logements, statut libre / occupé, taux d'occupation, recherche et filtres |
| 1 | D — Lot 3 | Locataires (recherche, fiche, solde), baux (loyer figé, un seul bail actif), clôture et caution |
| 2 | E — Lot 4 | Factures numérotées à lignes, corrections, génération automatique, retards et pénalités, PDF, partage WhatsApp / e-mail |
| 2 | F — Lot 5 | Paiements partiels, confirmation en transaction, annulation, caisse principale + réserve, tableau de bord |
| 2 | G — Lot 6 | Quittances PDF numérotées Q-AAAA-NNNNNN |
| 2 | H — Lot 7 | Dépenses avec reçu, contrôle du solde avec verrou, catégories, lien signalement, retraits, transferts |
| 2 | K — Lot 10 | Invitation locataire, espace locataire, déclaration de paiement avec preuve, signalements |

Reste pour le sprint 3 : refacturation, budgets, rapports (lot 8) ; gestionnaires et validation des dépenses (lot 9) ; notifications complètes et import CSV (lot 11) ; recette et mise en ligne.
