#!/usr/bin/env bash
set -euo pipefail

# Restore a custom-format dump into a target database (creates DB if missing).
# Usage: ./scripts/db-restore.sh <dump.dump> [target_db_name]
#
# WARNING: This drops and recreates the target database.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DUMP_FILE="${1:-}"
TARGET_DB="${2:-assembla_med_restore_drill}"
HOST_URL="${DATABASE_ADMIN_URL:-postgresql://terryturner@localhost:5432/postgres}"
PG_BIN="${PG_BIN:-/opt/homebrew/bin}"
PSQL="${PG_BIN}/psql"
PG_RESTORE="${PG_BIN}/pg_restore"

if [[ -z "${DUMP_FILE}" ]]; then
  echo "Usage: $0 <dump.dump> [target_db_name]" >&2
  exit 1
fi

if [[ ! -f "${DUMP_FILE}" ]]; then
  if [[ -f "${ROOT_DIR}/${DUMP_FILE}" ]]; then
    DUMP_FILE="${ROOT_DIR}/${DUMP_FILE}"
  elif [[ -f "${ROOT_DIR}/backups/${DUMP_FILE}" ]]; then
    DUMP_FILE="${ROOT_DIR}/backups/${DUMP_FILE}"
  else
    echo "Dump not found: ${DUMP_FILE}" >&2
    exit 1
  fi
fi

echo "Restoring ${DUMP_FILE} → database ${TARGET_DB}"

"${PSQL}" "${HOST_URL}" -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${TARGET_DB}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS ${TARGET_DB};
CREATE DATABASE ${TARGET_DB};
SQL

"${PG_RESTORE}" \
  --no-owner \
  --no-acl \
  --dbname="postgresql://terryturner@localhost:5432/${TARGET_DB}" \
  "${DUMP_FILE}"

echo "Restore complete: ${TARGET_DB}"
