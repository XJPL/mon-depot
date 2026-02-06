# Projet Node.js + TypeScript + React

Ce depot fournit un point de depart simple pour developper :
- **server/** : API Node.js (Express) en TypeScript
- **client/** : application React en TypeScript (Vite)

## Prerequis
- Node.js 18+ et npm

## Demarrage

### Demarrage rapide
```bash
# Docker (API + client)
export PENNYLANE_ACCESS_TOKEN="votre_token_oauth"
bash start.sh docker

# Local (API + client)
export PENNYLANE_ACCESS_TOKEN="votre_token_oauth"
bash start.sh local
```

Sur Windows (cmd) :
```
set PENNYLANE_ACCESS_TOKEN=votre_token_oauth
start.cmd docker
```

### API (Node.js)
```bash
cd server
npm install
npm run dev
```
L'API ecoute par defaut sur `http://localhost:3001` et expose `GET /api/health`.

#### Connecteur Pennylane
Definir les variables d'environnement avant de lancer le serveur :
```bash
export PENNYLANE_ACCESS_TOKEN="votre_token_oauth"
# Optionnel (par defaut): https://app.pennylane.com/api/external/v2
export PENNYLANE_BASE_URL="https://app.pennylane.com/api/external/v2"
# Optionnel (par defaut): server/data/pennylane.sqlite
export PENNYLANE_DB_PATH="server/data/pennylane.sqlite"
```

Endpoints exposes :
- `GET /api/pennylane/customer-invoices`
- `GET /api/pennylane/supplier-invoices`
- `POST /api/pennylane/sync?type=customer|supplier|all&month=YYYY-MM&limit=100`
- `POST /api/pennylane/sync?type=customer|supplier|all&incremental=true&since=YYYY-MM-DD`
- `GET /api/invoices?month=YYYY-MM&type=customer|supplier|all`
- `GET /api/invoices/summary?month=YYYY-MM&type=customer|supplier|all`

Les parametres de requete sont passes tels quels a l'API Pennylane.
Le endpoint `/api/pennylane/sync` gere la pagination automatiquement et stocke
les factures en base SQLite. Utiliser ensuite `/api/invoices` pour recuperer
les factures par mois.
`/api/invoices/summary` renvoie une liste simplifiee (date, numero, tiers,
ttc, tva, ht).

#### Mode incremental
Le mode incremental utilise la date de derniere synchronisation stockee en base
(`sync_state`) et applique un filtre `date >= derniere_sync`. Une premiere
execution sans historique fait une synchro complete.

#### CLI de synchronisation
```bash
cd server
npm run sync -- --type=all --month=2024-12
npm run sync -- --type=customer --incremental
npm run sync -- --type=supplier --incremental --since=2024-01-01
```

#### Scheduler (cron)
Le serveur peut lancer une synchro automatique si `PENNYLANE_CRON` est defini.
```bash
export PENNYLANE_CRON="0 2 * * *"
export PENNYLANE_CRON_TZ="Europe/Paris"
export PENNYLANE_CRON_TYPE="all"
export PENNYLANE_CRON_LIMIT="100"
export PENNYLANE_CRON_INCREMENTAL="true"
export PENNYLANE_CRON_RUN_ON_START="false"
# Optionnels
export PENNYLANE_CRON_MONTH="2024-12"
export PENNYLANE_CRON_SINCE="2024-01-01"
```

## Tests

### Tests unitaires
```bash
cd server
npm run test
```

### Tests de non regression (snapshots)
```bash
cd server
npm run test:regression
```

### Tests de charge
```bash
cd server
LOAD_BASE_URL="http://localhost:3001" \\
LOAD_PATH="/api/invoices/summary?month=2024-12&type=all" \\
LOAD_DURATION=15 LOAD_CONNECTIONS=25 \\
npm run load
```

## Bonnes pratiques
Les regles de developpement Node.js + TypeScript sont documentees ici :
`docs/bonnes-pratiques-node-ts.md`.

### Lint & format
```bash
# Server
cd server
npm run lint
npm run format:check

# Client
cd ../client
npm run lint
npm run format:check
```

### Front (React)
```bash
cd client
npm install
npm run dev
```
L'app Vite tourne par defaut sur `http://localhost:5173`.

Le front utilise un proxy Vite vers `http://localhost:3001` pour les requetes `/api`.
L'interface permet de saisir une cle API, choisir le type de factures et
optionnellement filtrer par code dossier (external_reference).

## Deploiement Docker (API + Client)

### Lancer en local
```bash
export PENNYLANE_ACCESS_TOKEN="votre_token_oauth"
docker compose up --build
```

Le site est disponible sur `http://localhost/` et proxy automatiquement `/api`
vers le service Node.

### URL publique (recupfactures)
Pour exposer l'URL publique `recupfactures`, configure un nom de domaine
pointant vers l'IP du serveur (A/AAAA) et, si besoin, un proxy TLS (Caddy,
Traefik, Nginx) devant le container web.
