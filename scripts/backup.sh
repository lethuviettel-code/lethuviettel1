#!/bin/sh
set -eu
PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
BACKUP_DIR=${BACKUP_DIR:-$PROJECT_ROOT/data/backups}
STORE_DATA_DIR=${DATA_DIR:-$PROJECT_ROOT/data}
umask 077
mkdir -p "$BACKUP_DIR"
BACKUP_STAMP=$(date -u +%Y%m%dT%H%M%SZ)
"$PROJECT_ROOT/.venv/bin/python" "$PROJECT_ROOT/server.py" backup --file "$BACKUP_DIR/store-$BACKUP_STAMP.sqlite3"
if [ -d "$STORE_DATA_DIR/uploads" ]; then
    tar -C "$STORE_DATA_DIR" -czf "$BACKUP_DIR/uploads-$BACKUP_STAMP.tar.gz" uploads
fi
# Copies are retained. Rotate or move off-host according to the deployment guide.
