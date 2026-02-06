# Bonnes pratiques Node.js + TypeScript

Ce document liste des regles simples et actionnables pour un projet
Node.js + TypeScript (API) et un client React. Elles sont appliquees
dans ce depot via lint, format et scripts.

## 1) Architecture & organisation
- Separer les couches: routes -> services -> acces donnees.
- Regrouper les types partages (DTO, interfaces) dans un module dedie.
- Garder les fichiers petits et nommes selon leur responsabilite.
- Eviter les dependances cycliques entre modules.

## 2) Configuration & secrets
- Centraliser la lecture des variables d'environnement.
- Ne jamais committer de secrets (utiliser .env local).
- Valider les variables au demarrage (presence, format).

## 3) TypeScript
- Activer `strict`.
- Preferer des types explicites aux `any`.
- Utiliser `unknown` puis affiner (type guards).
- Eviter les conversions implicites (toString explicite).

## 4) Erreurs & logs
- Toujours remonter une erreur claire et exploitable.
- Logger les erreurs cote serveur avec contexte.
- Ne pas exposer de secrets dans les logs.

## 5) API & robustesse
- Valider les entrees (query/body).
- Gestions des timeouts/retries pour les appels externes.
- Propager des codes HTTP coherents.

## 6) Qualite & format
- Lint obligatoire (ESLint).
- Formatage automatique (Prettier).
- Utiliser des scripts `lint` / `format` pour CI.

## 7) Tests
- Tests unitaires pour la logique critique.
- Tests de non regression par snapshots.
- Tests de charge isoles (hors CI par defaut).

## 8) Securite
- Ne jamais exposer une cle API en dur.
- Limiter les permissions (scopes minimaux).
- Verifier les dependances (audit).

## 9) Performance
- Eviter les boucles N+1.
- Paginer et limiter les volumes.
- Mettre en cache quand c'est possible.

## 10) Maintenance
- Preferer des commits petits et descriptifs.
- Documenter les decisions dans README.
- Mettre a jour les dependances regulierement.
