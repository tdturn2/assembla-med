#!/usr/bin/env bash
set -euo pipefail

# Backup local Assembla Med Postgres (Homebrew/Herd style).
# Prefers Homebrew client tools to avoid Herd psql / newer pg_dump mismatches.
# Usage: ./scripts/db-backup.sh [database_url]

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${ROOT_DIR}/backups"
mkdir -p "${BACKUP_DIR}"

PG_BIN="${PG_BIN:-/opt/homebrew/bin}"
PG_DUMP="${PG_BIN}/pg_dump"

DEFAULT_URL="postgresql://terryturner@localhost:5432/assembla_med"
DATABASE_URL="${1:-${DATABASE_URL:-$DEFAULT_URL}}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="${BACKUP_DIR}/assembla_med_${STAMP}.dump"

"${PG_DUMP}" \
  --no-owner \
  --no-acl \
  --format=custom \
  --file="${OUT_FILE}" \
  "${DATABASE_URL}"

ln -sfn "$(basename "${OUT_FILE}")" "${BACKUP_DIR}/latest.dump"

echo "Backup written: ${OUT_FILE}"
echo "Latest symlink: ${BACKUP_DIR}/latest.dump"
