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
```

Endpoints exposes :
- `GET /api/pennylane/customer-invoices`
- `GET /api/pennylane/supplier-invoices`

Les parametres de requete sont passes tels quels a l'API Pennylane.

### Front (React)
```bash
cd client
npm install
npm run dev
```
L'app Vite tourne par defaut sur `http://localhost:5173`.

Le front utilise un proxy Vite vers `http://localhost:3001` pour les requetes `/api`.
