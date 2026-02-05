# Projet Node.js + TypeScript + React

Ce depot fournit un point de depart simple pour developper :
- **server/** : API Node.js (Express) en TypeScript
- **client/** : application React en TypeScript (Vite)

## Prerequis
- Node.js 18+ et npm

## Demarrage

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
- `GET /api/invoices?month=YYYY-MM&type=customer|supplier|all`

Les parametres de requete sont passes tels quels a l'API Pennylane.
Le endpoint `/api/pennylane/sync` gere la pagination automatiquement et stocke
les factures en base SQLite. Utiliser ensuite `/api/invoices` pour recuperer
les factures par mois.

### Front (React)
```bash
cd client
npm install
npm run dev
```
L'app Vite tourne par defaut sur `http://localhost:5173`.

Le front utilise un proxy Vite vers `http://localhost:3001` pour les requetes `/api`.
