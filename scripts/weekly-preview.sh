#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${LOKA_URL:-https://loka-weather.jpbm62n289.workers.dev}"
CITY="${1:-tarnos}"
OUTPUT_FILE="${2:-weekly-preview.json}"
START_DATE="${3:-}"

if [[ -z "${ADMIN_TOKEN:-}" ]]; then
  read -r -s -p "Token administrateur LOKA : " ADMIN_TOKEN
  printf '\n'
fi

if [[ -z "${ADMIN_TOKEN}" ]]; then
  echo "Erreur : aucun token administrateur fourni." >&2
  exit 1
fi

echo "Génération de l’aperçu hebdomadaire pour ${CITY}…"

PREVIEW_URL="${BASE_URL}/api/admin/weekly/preview?city=${CITY}"
if [[ -n "${START_DATE}" ]]; then
  PREVIEW_URL="${PREVIEW_URL}&start=${START_DATE}"
fi

curl --fail-with-body -sS \
  -X POST \
  "${PREVIEW_URL}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Accept: application/json" \
  | tee "${OUTPUT_FILE}"

echo
echo "Aperçu enregistré dans : ${OUTPUT_FILE}"
