#!/usr/bin/env bash
# Instala (ou atualiza) os timers de backup diario e de teste mensal de restauracao.
#   sudo bash /srv/dicionario/deploy/install-backup.sh
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Execute com sudo: sudo bash /srv/dicionario/deploy/install-backup.sh"
  exit 1
fi

APP_ROOT=/srv/dicionario
command -v pg_dump > /dev/null || { echo "pg_dump nao encontrado (pacote postgresql-client)."; exit 1; }

install -d -o root -g root -m 0700 /var/backups/dicionario /var/lib/dicionario-backup
install -d -o root -g root -m 0700 /root/.cache/rclone /root/.config/rclone
install -d -o root -g root -m 0755 /etc/dicionario
if [[ ! -f /etc/dicionario/backup.env ]]; then
  install -o root -g root -m 0600 "$APP_ROOT/deploy/backup/backup.env.example" /etc/dicionario/backup.env
  echo "Criado /etc/dicionario/backup.env; defina RCLONE_REMOTE para ter copia fora do VPS."
fi

for unit in dicionario-backup.service dicionario-backup.timer \
            dicionario-backup-verify.service dicionario-backup-verify.timer; do
  install -o root -g root -m 0644 "$APP_ROOT/deploy/systemd/$unit" "/etc/systemd/system/$unit"
done
systemctl daemon-reload

echo "Executando o primeiro backup agora..."
systemctl start dicionario-backup.service
journalctl -u dicionario-backup.service -n 20 --no-pager

echo "Validando a restauracao..."
systemctl start dicionario-backup-verify.service
journalctl -u dicionario-backup-verify.service -n 10 --no-pager

systemctl enable --now dicionario-backup.timer dicionario-backup-verify.timer
systemctl list-timers 'dicionario-backup*' --no-pager
