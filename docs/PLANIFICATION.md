# LocaGest — Planification du projet (PERT et Gantt)

Source : document de planification rendu (`gestion_location.docx`). On compte en jours de travail (sans les week-ends). Début du projet : lundi 23/11/2026 (jour 0). Deux développeurs travaillent ensemble sur chaque lot : l'un fait le serveur (Laravel), l'autre l'affichage (Next.js).

## Les tâches

Durée retenue : **Te = (To + 4 Tm + Tp) / 6** (To = optimiste, Tm = la plus probable, Tp = pessimiste).

| Tâche | Description | Doit attendre | To | Tm | Tp | Te | Début | Fin | Marge libre | Marge totale | Sprint | État |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | Étude du cahier des charges, plan du projet et choix des échanges entre serveur et affichage (API) | – | 3 | 5 | 7 | 5 | 23/11/2026 | 27/11/2026 | 0 | 0 | 1 | ✅ Fait |
| B | Lot 1 — Mise en place du projet (Laravel, Next.js, rôles des utilisateurs) et connexion | A | 4 | 6 | 8 | 6 | 30/11/2026 | 07/12/2026 | 0 | 0 | 1 | ✅ Fait |
| C | Lot 2 — Biens et logements | B | 3 | 5 | 7 | 5 | 08/12/2026 | 14/12/2026 | 0 | 0 | 1 | ✅ Fait |
| D | Lot 3 — Locataires et contrats de location (baux) | C | 5 | 6 | 13 | 7 | 15/12/2026 | 23/12/2026 | 0 | 0 | 1 | ✅ Fait |
| E | Lot 4 — Factures, détail des factures, création automatique chaque mois, fichiers PDF | D | 6 | 8 | 16 | 9 | 24/12/2026 | 05/01/2027 | 0 | 0 | 2 | ✅ Fait |
| F | Lot 5 — Paiements, caisse (argent qui entre), tableau de bord | E | 7 | 10 | 13 | 10 | 06/01/2027 | 19/01/2027 | 0 | 0 | 2 | ✅ Fait |
| G | Lot 6 — Quittances en PDF | F | 2 | 3 | 4 | 3 | 20/01/2027 | 22/01/2027 | 0 | 8 | 2 | ✅ Fait |
| H | Lot 7 — Dépenses, vérification de l'argent disponible, retraits | F | 6 | 8 | 10 | 8 | 20/01/2027 | 29/01/2027 | 0 | 0 | 2 | ✅ Fait |
| I | Lot 8 — Dépenses payées par les locataires, budgets, prévisions, rapports | H | 7 | 9 | 17 | 10 | 01/02/2027 | 12/02/2027 | 0 | 0 | 3 | À faire |
| J | Lot 9 — Gestionnaires, droits d'accès, accord sur les dépenses | H | 5 | 7 | 9 | 7 | 01/02/2027 | 09/02/2027 | 0 | 3 | 3 | À faire |
| K | Lot 10 — Espace locataire, invitations, signalement de problèmes | G | 5 | 7 | 9 | 7 | 25/01/2027 | 02/02/2027 | 8 | 8 | 2 | ✅ Fait |
| L | Lot 11 — Alertes (notifications), import de fichiers Excel/CSV, dernières finitions | I, J, K | 3 | 5 | 7 | 5 | 15/02/2027 | 19/02/2027 | 0 | 0 | 3 | À faire |
| M | Tests de l'application (scénarios R1 à R21) | L | 4 | 6 | 8 | 6 | 22/02/2027 | 01/03/2027 | 0 | 0 | 3 | À faire |
| N | Mise en ligne de l'application | M | 1 | 2 | 3 | 2 | 02/03/2027 | 03/03/2027 | 0 | 0 | 3 | À faire |

## Chemin critique

**A → B → C → D → E → F → H → I → L → M → N** = 5 + 6 + 5 + 7 + 9 + 10 + 8 + 10 + 5 + 6 + 2 = **73 jours de travail**, mise en ligne prévue le **03/03/2027**.

Les tâches avec de la marge : **G** (quittances, 8 jours), **K** (espace locataire, 8 jours) et **J** (gestionnaires, 3 jours). On peut les donner au développeur qui n'est pas occupé par une tâche urgente.

Pourquoi cet ordre (cahier des charges) :
- E après D : une facture n'est faite que pour un contrat de location en cours (F40, RG05).
- F après E : un paiement correspond toujours à une facture.
- G et H après F : une quittance n'existe que pour une facture payée en entier (F50) ; une dépense est payée avec l'argent de la caisse, qui vient des paiements (RG21).
- I et J après H : le partage des dépenses (F106) et l'accord du propriétaire (F108) portent sur des dépenses.
- K après G : l'espace locataire montre les quittances (F71).
- L après I, J et K : les alertes touchent toutes les parties de l'application (F90 à F95).

## Sprints

| Sprint | Période | Tâches | Où les trouver dans le code |
|---|---|---|---|
| 1 | 23/11/2026 → 23/12/2026 | A, B, C, D | Issues [#1](https://github.com/adjakotan/locagest/issues/1) à [#4](https://github.com/adjakotan/locagest/issues/4) |
| 2 | 24/12/2026 → 02/02/2027 | E, F, G, H, K | Issues [#5](https://github.com/adjakotan/locagest/issues/5) à [#9](https://github.com/adjakotan/locagest/issues/9) |
| 3 | 01/02/2027 → 03/03/2027 | I, J, L, M, N | À créer |

Le planning sera mis à jour à la fin de chaque lot (retards, vacances de fin d'année pendant les lots 3 et 4, fonctions repoussées à la V2).
