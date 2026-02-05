#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:-docker}"

print_usage() {
  cat <<'EOF'
Usage: ./start.sh [docker|local]

docker (par defaut):
  - lance docker compose (API + client)

local:
  - lance server (node) + client (vite) en parallel
EOF
}

require_env() {
  if [[ -z "${PENNYLANE_ACCESS_TOKEN:-}" ]]; then
    echo "Erreur: PENNYLANE_ACCESS_TOKEN manquant."
    exit 1
  fi
}

install_if_needed() {
  if [[ ! -d node_modules ]]; then
    npm install
  fi
}

run_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Erreur: docker n'est pas installe."
    exit 1
  fi
  require_env
  echo "Demarrage via Docker..."
  docker compose up --build
}

run_local() {
  if ! command -v npm >/dev/null 2>&1; then
    echo "Erreur: npm n'est pas installe."
    exit 1
  fi
  require_env

  echo "Demarrage API..."
  (
    cd "${ROOT_DIR}/server"
    install_if_needed
    npm run dev
  ) &
  SERVER_PID=$!

  echo "Demarrage client..."
  (
    cd "${ROOT_DIR}/client"
    install_if_needed
    npm run dev
  ) &
  CLIENT_PID=$!

  trap 'echo "Arret..."; kill "${SERVER_PID}" "${CLIENT_PID}" 2>/dev/null || true' EXIT INT TERM
  wait
}

case "${MODE}" in
  docker)
    run_docker
    ;;
  local)
    run_local
    ;;
  -h|--help)
    print_usage
    ;;
  *)
    print_usage
    exit 1
    ;;
esac
