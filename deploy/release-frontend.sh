#!/usr/bin/env bash
# Publica um build do frontend sem tirar o site do ar.
#
#   sudo bash deploy/release-frontend.sh /caminho/do/dist      # ou dist.tar.gz
#   sudo bash deploy/release-frontend.sh --rollback            # volta para a versao anterior
#
# Cada build vira uma pasta imutavel em releases/frontend/<data> e o Nginx serve
# /srv/dicionario/dist, que passa a ser um symlink trocado de forma atomica.
# Antes da troca o build e validado (arquivos essenciais e tamanho do sitemap);
# depois dela, um smoke test local volta a versao anterior se algo falhar.
set -euo pipefail

APP_ROOT=${APP_ROOT:-/srv/dicionario}
LIVE=${LIVE:-$APP_ROOT/dist}
RELEASES=${RELEASES:-$APP_ROOT/releases/frontend}
SITE_HOST=${SITE_HOST:-dicionariogamer.com}
KEEP=${KEEP:-5}
# O novo sitemap precisa ter pelo menos esta fracao das URLs do atual.
MIN_SITEMAP_RATIO=${MIN_SITEMAP_RATIO:-0.9}

die() { echo "ERRO: $*" >&2; exit 1; }

if [[ ${EUID} -ne 0 ]]; then
  die "execute com sudo: sudo bash ${APP_ROOT}/deploy/release-frontend.sh <dist|dist.tar.gz>"
fi

current_target() { [[ -L $LIVE ]] && readlink -f -- "$LIVE" || true; }

switch_to() {
  local target=$1 tmp_link
  tmp_link="${LIVE}.next.$$"
  ln -sfn -- "$target" "$tmp_link"
  if [[ -d $LIVE && ! -L $LIVE ]]; then
    # Primeira execucao: dist ainda e uma pasta real. Ela vira uma release
    # "legacy" e o symlink entra no lugar (troca de dois renames seguidos).
    local legacy
    legacy="$RELEASES/legacy-$(date +%Y%m%d-%H%M%S)"
    mv -T -- "$LIVE" "$legacy"
    mv -T -- "$tmp_link" "$LIVE"
    echo "$legacy" > "$RELEASES/.previous"
  else
    mv -T -- "$tmp_link" "$LIVE"
  fi
}

smoke_test() {
  local base="https://${SITE_HOST}"
  local resolve=(--resolve "${SITE_HOST}:443:127.0.0.1")
  curl -fsS --max-time 10 -o /dev/null "${resolve[@]}" "$base/" || return 1
  curl -fsS --max-time 10 -o /dev/null "${resolve[@]}" "$base/noticias/" || return 1
  curl -fsS --max-time 10 -o /dev/null "${resolve[@]}" "$base/sitemap.xml" || return 1
  # Um manifesto inexistente deve dar 404, nunca cair no index.html.
  local code
  code=$(curl -sS --max-time 10 -o /dev/null -w '%{http_code}' "${resolve[@]}" \
    "$base/static-loader-data-manifest-inexistente.json") || return 1
  [[ $code == 404 ]] || { echo "manifesto inexistente respondeu $code" >&2; return 1; }
}

mkdir -p -- "$RELEASES"

if [[ ${1:-} == --rollback ]]; then
  previous=$(cat "$RELEASES/.previous" 2>/dev/null || true)
  [[ -n $previous && -d $previous ]] || die "nenhuma release anterior registrada."
  now=$(current_target)
  switch_to "$previous"
  [[ -n $now ]] && echo "$now" > "$RELEASES/.previous"
  smoke_test || echo "AVISO: smoke test falhou apos o rollback; verifique o Nginx." >&2
  echo "Rollback concluido: $previous"
  exit 0
fi

source_path=${1:-}
[[ -n $source_path && -e $source_path ]] || die "informe a pasta dist ou o arquivo dist.tar.gz gerado pelo build."

release="$RELEASES/$(date +%Y%m%d-%H%M%S)"
staging="${release}.partial"
cleanup() { rm -rf -- "$staging"; }
trap cleanup EXIT
mkdir -p -- "$staging"

if [[ -d $source_path ]]; then
  cp -a -- "$source_path/." "$staging/"
else
  tar -xzf "$source_path" -C "$staging"
  # Aceita tanto um tar do conteudo quanto um tar que contem a pasta dist/.
  if [[ ! -f $staging/index.html && -f $staging/dist/index.html ]]; then
    mv -- "$staging/dist" "${staging}.inner" && rm -rf -- "$staging" && mv -T -- "${staging}.inner" "$staging"
  fi
fi

for required in index.html sitemap.xml robots.txt noticias/index.html; do
  [[ -s $staging/$required ]] || die "build incompleto: falta $required."
done
compgen -G "$staging/static-loader-data-manifest-*.json" > /dev/null \
  || die "build incompleto: manifesto do SSG ausente."
grep -q "Sitemap: https://${SITE_HOST}/sitemap.xml" "$staging/robots.txt" \
  || die "robots.txt aponta para outro dominio; confira VITE_SITE_URL no build."

new_urls=$( (grep -o '<loc>' "$staging/sitemap.xml" || true) | wc -l)
if [[ -s $LIVE/sitemap.xml ]]; then
  live_urls=$( (grep -o '<loc>' "$LIVE/sitemap.xml" || true) | wc -l)
  if ! awk -v n="$new_urls" -v l="$live_urls" -v r="$MIN_SITEMAP_RATIO" 'BEGIN { exit !(n >= l * r) }'; then
    if [[ ${FORCE_SMALLER_SITEMAP:-0} != 1 ]]; then
      die "o novo sitemap tem $new_urls URLs contra $live_urls no ar. Provavel build sem termos/noticias. Use FORCE_SMALLER_SITEMAP=1 se for intencional."
    fi
  fi
fi

chmod -R u=rwX,go=rX -- "$staging"
mv -T -- "$staging" "$release"
trap - EXIT

previous=$(current_target)
switch_to "$release"
[[ -n $previous ]] && echo "$previous" > "$RELEASES/.previous"

if ! smoke_test; then
  echo "Smoke test falhou; voltando para a release anterior." >&2
  if [[ -n $previous ]]; then
    switch_to "$previous"
  elif [[ -s $RELEASES/.previous ]]; then
    switch_to "$(cat "$RELEASES/.previous")"
  fi
  exit 1
fi

# Mantem as KEEP releases mais recentes, alem da atual e da anterior.
keep_previous=$(cat "$RELEASES/.previous" 2>/dev/null || true)
find "$RELEASES" -mindepth 1 -maxdepth 1 -type d ! -name '*.partial' -printf '%T@ %p\n' \
  | sort -rn | tail -n +"$((KEEP + 1))" | cut -d' ' -f2- \
  | while read -r old; do
      [[ $old == "$release" || $old == "$keep_previous" ]] && continue
      rm -rf -- "$old"
    done

echo "Frontend publicado: $release ($new_urls URLs no sitemap)"
echo "Rollback: sudo bash $APP_ROOT/deploy/release-frontend.sh --rollback"
