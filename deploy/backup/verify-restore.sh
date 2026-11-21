#!/usr/bin/env bash
# Prova que o ultimo backup restaura: carrega o dump mais recente num banco
# descartavel, confere as tabelas principais e apaga o banco em seguida.
# Executado mensalmente pelo dicionario-backup-verify.timer.
set -euo pipefail

CONFIG_FILE=${CONFIG_FILE:-/etc/dicionario/backup.env}
# shellcheck disable=SC1090
[[ -f $CONFIG_FILE ]] && source "$CONFIG_FILE"

BACKUP_DIR=${BACKUP_DIR:-/var/backups/dicionario}
CHECK_DB=${CHECK_DB:-dicionariogamer_restore_check}
# Idade maxima aceitavel do ultimo dump, em horas.
MAX_AGE_HOURS=${MAX_AGE_HOURS:-36}

log() { printf '[restore-check] %s\n' "$*"; }
die() { printf '[restore-check] ERRO: %s\n' "$*" >&2; exit 1; }
as_postgres() { runuser -u postgres -- "$@"; }

latest=$(find "$BACKUP_DIR/db" -maxdepth 1 -name '*.dump' -type f -printf '%T@ %p\n' | sort -rn | head -n 1 | cut -d' ' -f2-)
[[ -n $latest ]] || die "nenhum dump encontrado em $BACKUP_DIR/db."

age_hours=$(( ($(date +%s) - $(stat -c %Y -- "$latest")) / 3600 ))
(( age_hours <= MAX_AGE_HOURS )) || die "ultimo dump tem ${age_hours}h; o backup diario parou de rodar."
[[ -f $latest.sha256 ]] || die "checksum ausente para $latest."
sha256sum --check --status -- "$latest.sha256" || die "checksum invalido para $latest."

cleanup() { as_postgres dropdb --if-exists "$CHECK_DB" || true; }
trap cleanup EXIT
cleanup

log "restaurando $(basename -- "$latest") em $CHECK_DB..."
as_postgres createdb "$CHECK_DB"
# O dump e lido pelo usuario postgres via stdin, sem mudar permissoes da pasta.
as_postgres pg_restore --exit-on-error --no-owner --no-acl --dbname="$CHECK_DB" < "$latest"

counts=$(as_postgres psql --dbname="$CHECK_DB" --tuples-only --no-align --field-separator=' ' --command \
  'SELECT (SELECT count(*) FROM "Term"), (SELECT count(*) FROM "News"), (SELECT count(*) FROM "User"), (SELECT count(*) FROM "_prisma_migrations")')
read -r terms news users migrations <<< "$counts"
log "termos=$terms noticias=$news usuarios=$users migracoes=$migrations"
(( terms > 0 && users > 0 && migrations > 0 )) || die "restauracao vazia ou incompleta."

log "restauracao verificada."
