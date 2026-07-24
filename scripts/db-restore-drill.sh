#!/usr/bin/env bash
set -euo pipefail

# Prove backup → restore works without touching the primary local DB.
# Usage: ./scripts/db-restore-drill.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DRILL_DB="assembla_med_restore_drill"
HOST_URL="${DATABASE_ADMIN_URL:-postgresql://terryturner@localhost:5432/postgres}"
PG_BIN="${PG_BIN:-/opt/homebrew/bin}"
PSQL="${PG_BIN}/psql"

"${ROOT_DIR}/scripts/db-backup.sh"

DUMP_FILE="${ROOT_DIR}/backups/latest.dump"
"${ROOT_DIR}/scripts/db-restore.sh" "${DUMP_FILE}" "${DRILL_DB}"

TABLE_COUNT="$("${PSQL}" --dbname="postgresql://terryturner@localhost:5432/${DRILL_DB}" -Atc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")"

echo "Drill restored public tables: ${TABLE_COUNT}"

if [[ "${TABLE_COUNT}" -lt 1 ]]; then
  echo "Restore drill failed: no tables found in ${DRILL_DB}" >&2
  exit 1
fi

"${PSQL}" "${HOST_URL}" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${DRILL_DB};"

echo "Restore drill passed. Scratch DB dropped."
