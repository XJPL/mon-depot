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

### Front (React)
```bash
cd client
npm install
npm run dev
```
L'app Vite tourne par defaut sur `http://localhost:5173`.

Le front utilise un proxy Vite vers `http://localhost:3001` pour les requetes `/api`.
