#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# deploy.sh — backup database then deploy to production
# ---------------------------------------------------------------------------
# Usage: ./deploy.sh
# Requires: docker, a running postgres container (food_planner_db), .env file
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/food_planner_${TIMESTAMP}.sql.gz"

# Load env so we have POSTGRES_USER / POSTGRES_DB available
if [[ -f "${SCRIPT_DIR}/.env" ]]; then
  set -a; source "${SCRIPT_DIR}/.env"; set +a
fi

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-food_planner}"
DB_CONTAINER="food_planner_db"

# ---------------------------------------------------------------------------
# 1. Backup
# ---------------------------------------------------------------------------
echo "==> Creating backup directory: ${BACKUP_DIR}"
mkdir -p "${BACKUP_DIR}"

if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  echo "==> Backing up database '${POSTGRES_DB}' to ${BACKUP_FILE} …"
  docker exec "${DB_CONTAINER}" \
    pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" \
    | gzip > "${BACKUP_FILE}"
  echo "==> Backup complete: $(du -h "${BACKUP_FILE}" | cut -f1)"
else
  echo "==> WARNING: Container '${DB_CONTAINER}' is not running — skipping backup."
  echo "    If this is the first deploy, that's expected. Otherwise, investigate first."
  read -r -p "    Continue without backup? [y/N] " confirm
  [[ "${confirm}" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }
fi

# ---------------------------------------------------------------------------
# 2. Keep only the 10 most recent backups
# ---------------------------------------------------------------------------
echo "==> Pruning old backups (keeping 10 most recent) …"
ls -1t "${BACKUP_DIR}"/food_planner_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm --
echo "    Done."

# ---------------------------------------------------------------------------
# 3. Deploy
# ---------------------------------------------------------------------------
echo "==> Deploying …"
cd "${SCRIPT_DIR}"
docker compose -f docker-compose.prod.yml up --build -d

echo ""
echo "==> Deploy complete."
echo "    Backup saved to: ${BACKUP_FILE}"
