#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Execute com sudo: sudo bash /srv/dicionario/deploy/finish-production-deploy.sh"
  exit 1
fi

APP_ROOT=/srv/dicionario
NGINX_CONFIG=/etc/nginx/sites-available/dicionario
NGINX_BACKUP="${NGINX_CONFIG}.pre-loader-rule-$(date +%Y%m%d-%H%M%S)"
NGINX_TMP=$(mktemp)

cleanup() {
  rm -f "${NGINX_TMP}"
}
trap cleanup EXIT

if [[ ! -d ${APP_ROOT} || ! -f ${NGINX_CONFIG} ]]; then
  echo "Projeto ou configuracao do Nginx nao encontrados."
  exit 1
fi

if ! grep -q 'static-loader-data' "${NGINX_CONFIG}"; then
  cp -a "${NGINX_CONFIG}" "${NGINX_BACKUP}"
  awk '
    !inserted && /^[[:space:]]*location[[:space:]]+\/[[:space:]]*\{/ {
      print "    location ~ ^/static-loader-data(?:-manifest-[^/]+\\.json|/.*\\.json)$ {"
      print "        try_files $uri =404;"
      print "        add_header Cache-Control \"no-cache\";"
      print "    }"
      print ""
      inserted = 1
    }
    { print }
    END { if (!inserted) exit 42 }
  ' "${NGINX_CONFIG}" > "${NGINX_TMP}"
  install -o root -g root -m 0644 "${NGINX_TMP}" "${NGINX_CONFIG}"

  if ! nginx -t; then
    cp -a "${NGINX_BACKUP}" "${NGINX_CONFIG}"
    echo "Configuracao do Nginx restaurada apos falha de validacao."
    exit 1
  fi
else
  nginx -t
fi

install -o root -g root -m 0644 \
  "${APP_ROOT}/deploy/systemd/dicionario-newsletter.service" \
  /etc/systemd/system/dicionario-newsletter.service
install -o root -g root -m 0644 \
  "${APP_ROOT}/deploy/systemd/dicionario-newsletter.timer" \
  /etc/systemd/system/dicionario-newsletter.timer

systemctl daemon-reload
systemctl restart dicionario.service
bash "${APP_ROOT}/deploy/install-nginx-hardening.sh"

if grep -q '^RESEND_WEBHOOK_SECRET=.' "${APP_ROOT}/server/.env" \
  && grep -q '^NEWSLETTER_ENABLED=true$' "${APP_ROOT}/server/.env"; then
  systemctl enable --now dicionario-newsletter.timer
  echo "Timer da newsletter habilitado."
else
  echo "Timer instalado, mas nao habilitado: configure o webhook e NEWSLETTER_ENABLED=true primeiro."
fi

echo "API: $(systemctl is-active dicionario.service)"
echo "Nginx: $(systemctl is-active nginx)"
echo "Timer: $(systemctl is-enabled dicionario-newsletter.timer 2>/dev/null || true)"
