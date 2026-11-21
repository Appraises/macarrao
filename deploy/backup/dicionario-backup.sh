#!/usr/bin/env bash
# Backup diario do Dicionario Gamer: banco PostgreSQL + uploads.
#
# Executado pelo dicionario-backup.timer. Configuracao opcional em
# /etc/dicionario/backup.env (veja backup.env.example). Sem RCLONE_REMOTE o
# backup fica so no VPS, o que NAO protege contra a perda da maquina.
set -euo pipefail

CONFIG_FILE=${CONFIG_FILE:-/etc/dicionario/backup.env}
# shellcheck disable=SC1090
[[ -f $CONFIG_FILE ]] && source "$CONFIG_FILE"

APP_ENV_FILE=${APP_ENV_FILE:-/srv/dicionario/server/.env}
BACKUP_DIR=${BACKUP_DIR:-/var/backups/dicionario}
UPLOAD_DIR=${UPLOAD_DIR:-/srv/dicionario/server/uploads}
RETENTION_DAYS=${RETENTION_DAYS:-14}
REMOTE_RETENTION_DAYS=${REMOTE_RETENTION_DAYS:-35}
RCLONE_REMOTE=${RCLONE_REMOTE:-}
STATUS_FILE=${STATUS_FILE:-/var/lib/dicionario-backup/last-success}

log() { printf '[backup] %s\n' "$*"; }
die() { printf '[backup] ERRO: %s\n' "$*" >&2; exit 1; }

# Le DATABASE_URL do .env da API sem executar o arquivo.
database_url=${DATABASE_URL:-}
if [[ -z $database_url ]]; then
  [[ -r $APP_ENV_FILE ]] || die "nao foi possivel ler $APP_ENV_FILE."
  database_url=$(sed -n 's/^[[:space:]]*DATABASE_URL[[:space:]]*=[[:space:]]*//p' "$APP_ENV_FILE" | tail -n 1)
  database_url=${database_url%\"}; database_url=${database_url#\"}
  database_url=${database_url%\'}; database_url=${database_url#\'}
fi
[[ -n $database_url ]] || die "DATABASE_URL nao encontrada."
# Parametros do Prisma (schema, connection_limit, pool_timeout...) nao sao
# aceitos pelo libpq; o dump usa a URL sem query string.
pg_url=${database_url%%\?*}

stamp=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p -- "$BACKUP_DIR/db" "$BACKUP_DIR/uploads" "$(dirname -- "$STATUS_FILE")"
chmod 700 -- "$BACKUP_DIR"

dump="$BACKUP_DIR/db/dicionariogamer-$stamp.dump"
log "gerando dump do banco..."
pg_dump --format=custom --no-owner --no-acl --compress=6 --dbname="$pg_url" --file="$dump.partial"
# Um dump ilegivel e pior que nenhum: valida o indice antes de aceitar.
pg_restore --list "$dump.partial" > /dev/null || die "dump gerado esta corrompido."
mv -- "$dump.partial" "$dump"
sha256sum -- "$dump" > "$dump.sha256"
log "dump ok: $(du -h -- "$dump" | cut -f1)"

if [[ -d $UPLOAD_DIR ]]; then
  uploads_tar="$BACKUP_DIR/uploads/uploads-$stamp.tar.gz"
  tar -czf "$uploads_tar.partial" -C "$UPLOAD_DIR" .
  mv -- "$uploads_tar.partial" "$uploads_tar"
  log "uploads ok: $(du -h -- "$uploads_tar" | cut -f1)"
else
  log "AVISO: $UPLOAD_DIR nao existe; uploads nao foram copiados."
fi

find "$BACKUP_DIR/db" "$BACKUP_DIR/uploads" -type f -mtime +"$RETENTION_DAYS" -delete

if [[ -n $RCLONE_REMOTE ]]; then
  command -v rclone > /dev/null || die "RCLONE_REMOTE definido, mas o rclone nao esta instalado."
  log "enviando para $RCLONE_REMOTE..."
  rclone copy --immutable "$BACKUP_DIR/db" "$RCLONE_REMOTE/db"
  # Uploads sao imutaveis (nome unico por arquivo): espelho incremental.
  [[ -d $UPLOAD_DIR ]] && rclone copy --immutable "$UPLOAD_DIR" "$RCLONE_REMOTE/uploads-mirror"
  rclone delete --min-age "${REMOTE_RETENTION_DAYS}d" "$RCLONE_REMOTE/db"
  log "copia externa ok."
else
  log "AVISO: RCLONE_REMOTE vazio; o backup existe apenas neste servidor."
fi

date -u +%Y-%m-%dT%H:%M:%SZ > "$STATUS_FILE"
log "concluido."
