#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Execute com sudo: sudo bash /srv/dicionario/deploy/install-nginx-hardening.sh"
  exit 1
fi

APP_ROOT=/srv/dicionario
SNIPPET_SOURCE="${APP_ROOT}/deploy/nginx/public-app-security.conf"
SNIPPET_TARGET=/etc/nginx/snippets/public-app-security.conf
STAMP=$(date +%Y%m%d-%H%M%S)

declare -A SITE_LOGS=(
  [/etc/nginx/sites-available/dicionario]=dicionariogamer
  [/etc/nginx/sites-available/api-dicionario]=dicionariogamer-api
  [/etc/nginx/sites-available/poderse]=poderse
)
modified_configs=()
backups=()

if [[ ! -f ${SNIPPET_SOURCE} ]]; then
  echo "Snippet de seguranca nao encontrado: ${SNIPPET_SOURCE}"
  exit 1
fi

install -o root -g root -m 0644 "${SNIPPET_SOURCE}" "${SNIPPET_TARGET}"

for config in "${!SITE_LOGS[@]}"; do
  [[ -f ${config} ]] || continue

  marker="# managed-public-app-security"
  if grep -qF "${marker}" "${config}"; then
    continue
  fi

  backup="${config}.pre-hardening-${STAMP}"
  cp -a "${config}" "${backup}"
  modified_configs+=("${config}")
  backups+=("${backup}")

  log_name=${SITE_LOGS[${config}]}
  tmp=$(mktemp)
  awk -v marker="${marker}" -v log_name="${log_name}" '
    {
      print
      if ($0 ~ /^[[:space:]]*server[[:space:]]*\{[[:space:]]*$/) {
        print "    " marker
        print "    access_log /var/log/nginx/" log_name ".access.log;"
        print "    error_log /var/log/nginx/" log_name ".error.log warn;"
        print "    include /etc/nginx/snippets/public-app-security.conf;"
      }
    }
  ' "${config}" > "${tmp}"
  install -o root -g root -m 0644 "${tmp}" "${config}"
  rm -f "${tmp}"
done

if ! nginx -t; then
  for index in "${!modified_configs[@]}"; do
    cp -a "${backups[${index}]}" "${modified_configs[${index}]}"
  done
  nginx -t || true
  echo "Falha na validacao do Nginx. As configuracoes anteriores foram restauradas."
  exit 1
fi

systemctl reload nginx

echo "Hardening instalado e Nginx recarregado."
echo "Logs:"
printf '  %s\n' \
  /var/log/nginx/dicionariogamer.access.log \
  /var/log/nginx/dicionariogamer-api.access.log \
  /var/log/nginx/poderse.access.log
