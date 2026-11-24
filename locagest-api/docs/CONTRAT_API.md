# LocaGest — Contrat d'API (sprints 1 et 2)

Base : `http://localhost:8000/api` · Format : JSON · Montants : entiers en FCFA (RG12) · Dates : `AAAA-MM-JJ`.

## Authentification (Sanctum, mode SPA)

1. `GET /sanctum/csrf-cookie` → dépose le cookie `XSRF-TOKEN`.
2. Chaque requête d'écriture envoie l'en-tête `X-XSRF-TOKEN` (valeur du cookie) et les cookies (`credentials: "include"`).
3. `POST /api/login` ouvre la session ; `POST /api/logout` l'invalide côté serveur.

## Format des réponses

| Cas | Code | Corps |
|---|---|---|
| Ressource | 200 / 201 | `{ "data": { ... } }` |
| Liste paginée | 200 | `{ "data": [...], "links": {...}, "meta": { "current_page", "last_page", "total", "per_page" } }` |
| Erreur de validation ou règle de gestion | 422 | `{ "message": "...", "errors": { "champ": ["message"] } }` |
| Non connecté | 401 | `{ "message": "Unauthenticated." }` |
| Accès refusé (rôle, autre propriétaire) | 403 | `{ "message": "Accès refusé." }` |
| Introuvable | 404 | `{ "message": "Ressource introuvable." }` |
| Lien d'invitation expiré / utilisé | 410 | `{ "message": "..." }` |
| Trop de tentatives (login…) | 429 | `{ "message": "..." }` |

Les énumérations sont renvoyées avec leur libellé français : `status` + `status_label`, `type` + `type_label`, etc.

## Routes

### Public
| Méthode | Route | Rôle |
|---|---|---|
| POST | `/register` | Inscription propriétaire (F01) — `name, email, phone, password, password_confirmation, account_type (individual\|company), company_name, company_ifu` |
| POST | `/login` | Connexion (F02) — `email, password, remember` |
| POST | `/forgot-password`, `/reset-password` | Mot de passe oublié (F02) |
| GET / POST | `/invitations/{token}`, `/invitations/{token}/accept` | Invitation locataire (F04) |

### Tous les rôles connectés
| Méthode | Route | Rôle |
|---|---|---|
| POST | `/logout` | Déconnexion |
| GET | `/user` | Utilisateur connecté et son rôle |
| PUT | `/user/profile`, `/user/password` | Profil, mot de passe (F05) |
| GET | `/invoices/{id}/pdf` | Avis d'échéance PDF (F48) — propriétaire ou locataire titulaire |
| GET | `/payments/{id}/receipt` | Quittance PDF (F52, R8) |
| GET | `/payments/{id}/proof` | Preuve de paiement fournie par le locataire |
| GET / POST | `/maintenance-requests` | Signalements (F80, F83) — multipart si photo |
| GET | `/maintenance-requests/{id}`, `/maintenance-requests/{id}/photo` | Détail, photo |

### Propriétaire (`role:owner`)
| Méthode | Route | Rôle |
|---|---|---|
| GET | `/dashboard?month=AAAA-MM&property=` | Indicateurs (F60–F65) |
| GET / POST | `/properties?search=&city=` | Biens (F10, F14) |
| GET / PUT / DELETE | `/properties/{id}` | Bien (avec ses logements) |
| GET | `/properties/cities` | Villes (filtres) |
| GET / POST | `/properties/{id}/units` | Logements d'un bien (F11) |
| GET | `/units?city=&property=&status=&type=&rent_min=&rent_max=&search=` | Recherche de logements (F16) |
| GET / PUT / DELETE | `/units/{id}` | Logement + historique des baux (F34) ; suppression refusée si bail (F13) |
| GET / POST | `/tenants?search=` | Locataires (F20, F21) |
| GET / PUT | `/tenants/{id}` | Fiche : baux, factures, paiements, solde (F22) |
| POST | `/tenants/{id}/invite` | Envoyer l'invitation (F04) |
| GET / POST | `/leases?status=&property=&search=` | Baux (F30–F32, RG02) |
| GET | `/leases/{id}` | Bail |
| POST | `/leases/{id}/end` | Clôture + caution — `end_date, deposit_returned, deposit_deductions_note` (F33, F35) |
| GET | `/invoices?month=&status=&property=&tenant=&lease=` | Factures (F45) |
| POST | `/invoices` | Créer la facture d'un bail — `lease_id, month` |
| POST | `/invoices/generate` | Générer les factures du mois — `month` |
| GET | `/invoices/{id}` | Détail (lignes, paiements, quittance) |
| POST | `/invoices/{id}/items` | Ajouter une ligne / correction (F47, RG25) — `type, label, amount` |
| POST | `/invoices/{id}/payments` | Paiement confirmé d'office (F41) — `amount, paid_at, method, reference, note` |
| GET | `/payments?status=declared` | Paiements (à confirmer par défaut) |
| POST | `/payments/{id}/confirm`, `/reject`, `/cancel` | Confirmer / refuser (`reason`) / annuler (`reason` obligatoire) |
| GET | `/properties/{id}/cash?fund=` | Soldes + mouvements (F100) |
| POST | `/properties/{id}/cash/withdrawals` | Retrait (F109) — `amount, note` |
| POST | `/properties/{id}/cash/transfers` | Transfert (F110) — `from (main\|reserve), amount, note` |
| GET / POST | `/expense-categories` | Catégories (F104) |
| GET / POST | `/expenses?property=&category=&status=&month=` | Dépenses (F102, F103) — multipart, `receipt` facultatif |
| GET | `/expenses/{id}`, `/expenses/{id}/receipt` | Détail, reçu |
| POST | `/expenses/{id}/cancel` | Annulation avec motif (RG20) |
| PATCH | `/maintenance-requests/{id}` | Changer le statut (F81) |

### Locataire (`role:tenant`)
| Méthode | Route | Rôle |
|---|---|---|
| GET | `/me/leases` | Bail actif, historique, solde dû (F70, F72) |
| GET | `/me/invoices`, `/me/invoices/{id}` | Mes factures (F70, F71) |
| POST | `/me/invoices/{id}/payments` | Déclarer un paiement avec preuve (F49, F73) — multipart, `proof` facultatif |
| GET | `/me/payments` | Suivi de mes déclarations |
