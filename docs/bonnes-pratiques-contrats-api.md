# Bonnes pratiques pour les contrats d'API

Ce document definit les regles pour stabiliser les contrats d'API et
reduire les regressions. Il est applique dans ce projet.

## 1) Versioning
- Prefixer les endpoints (ex: `/api/v1/...`).
- Ne jamais casser un contrat existant sans nouvelle version.

## 2) Validation d'entree
- Valider toutes les queries/bodies/cookies.
- Retourner un `400` avec details de validation.

## 3) Formats de donnees
- Dates: ISO 8601 (`YYYY-MM-DD` / `YYYY-MM-DDTHH:mm:ssZ`).
- Montants: string (eviter les flottants en JS).
- IDs: integer/UUID stable.

## 4) Pagination
- Toujours exposer `limit`, `cursor` ou `page`.
- Renvoyer `next_cursor` quand applicable.

## 5) Erreurs
- Format d'erreur stable: code + message + details.
- Toujours renvoyer un `X-Request-Id`.

## 6) Securite
- Auth obligatoire pour les ressources sensibles.
- Ne jamais logger les secrets.

## 7) Compatibilite
- Ne pas renommer un champ existant.
- Ajouter de nouveaux champs de facon retro-compatible.

## 8) Observabilite
- Ajouter un request id et le propager dans les logs.

## 9) Documentation
- Documenter les endpoints et leurs schemas (OpenAPI).
- Garder la doc a jour a chaque changement.

## Application dans le projet
- Validation des queries avec Zod (sync, invoices, summary).
- Erreurs uniformes: `{ error, code, details, requestId }`.
- Ajout de `X-Request-Id` sur toutes les reponses.
