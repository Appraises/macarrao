#!/bin/bash
set -euo pipefail

if [[ $(id -u) != 0 ]]; then
    echo 'Instale o importador como root.' >&2
    exit 1
fi

source_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
app_root=/srv/dicionario/server
runtime=$(mktemp -d /usr/local/lib/dicionario-news-import.XXXXXXXX)
policy=$(mktemp /etc/sudoers.d/.dicionario-import-news.XXXXXXXX)
trap 'rm -f -- "$policy" "$runtime.link"' EXIT

install -d -m 755 "$runtime/social" "$runtime/node_modules/@prisma" "$runtime/node_modules/.prisma"
install -m 644 "$source_root/deploy/editorial-import/start.mjs" "$runtime/start.mjs"
install -m 644 "$source_root/server/scripts/publish-news.mjs" "$runtime/publish-news.mjs"
install -m 644 "$source_root/server/scripts/social/hashtags.mjs" "$runtime/social/hashtags.mjs"
cp -R --no-preserve=all -- "$app_root/node_modules/@prisma/client" "$runtime/node_modules/@prisma/"
cp -R --no-preserve=all -- "$app_root/node_modules/.prisma/client" "$runtime/node_modules/.prisma/"

# The delegated command must not load code from the SSH user's writable checkout.
if [[ -n $(find "$runtime" ! -type f ! -type d -print -quit) ]]; then
    echo 'O importador nao aceita links nem arquivos especiais no runtime.' >&2
    exit 1
fi
chown -R root:root "$runtime"
chmod -R go-w "$runtime"
chmod 755 "$runtime"

install -m 440 "$source_root/deploy/editorial-import/sudoers" "$policy"
visudo -cf "$policy"
cd -- "$runtime"
/usr/sbin/runuser -u dicionario -- /usr/bin/env -i PATH=/usr/bin:/bin /usr/bin/node ./publish-news.mjs --help

ln -s -- "$runtime" "$runtime.link"
mv -Tf -- "$runtime.link" /usr/local/lib/dicionario-news-import
install -o root -g root -m 755 "$source_root/deploy/editorial-import/dicionario-import-news" /usr/local/bin/dicionario-import-news
mv -Tf -- "$policy" /etc/sudoers.d/dicionario-import-news
visudo -c
