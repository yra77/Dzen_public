#!/usr/bin/env bash
set -euo pipefail

# This script creates/updates a local .npmrc for environments that require an internal npm registry mirror.
# Usage:
#   NPM_REGISTRY_URL=https://npm.example.local/repository/npm-group/ ./scripts/bootstrap-npm-auth.sh
# Optional:
#   NPM_REGISTRY_TOKEN=<token> (to write auth token line for the host in .npmrc)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
NPMRC_PATH="${PROJECT_DIR}/.npmrc"

if [[ -z "${NPM_REGISTRY_URL:-}" ]]; then
  echo "[bootstrap-npm-auth] NPM_REGISTRY_URL is required." >&2
  echo "Example: NPM_REGISTRY_URL=https://npm.example.local/repository/npm-group/ ./scripts/bootstrap-npm-auth.sh" >&2
  exit 1
fi

REGISTRY_URL="${NPM_REGISTRY_URL%/}/"
REGISTRY_HOST="${REGISTRY_URL#https://}"
REGISTRY_HOST="${REGISTRY_HOST#http://}"

{
  echo "registry=${REGISTRY_URL}"
  echo "always-auth=true"

  if [[ -n "${NPM_REGISTRY_TOKEN:-}" ]]; then
    echo "//${REGISTRY_HOST}:_authToken=${NPM_REGISTRY_TOKEN}"
  fi
} > "${NPMRC_PATH}"

echo "[bootstrap-npm-auth] Updated ${NPMRC_PATH} with registry ${REGISTRY_URL}."
if [[ -z "${NPM_REGISTRY_TOKEN:-}" ]]; then
  echo "[bootstrap-npm-auth] Token was not provided. If your mirror requires auth, export NPM_REGISTRY_TOKEN and rerun." >&2
fi
