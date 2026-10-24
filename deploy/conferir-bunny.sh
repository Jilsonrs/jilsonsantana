#!/usr/bin/env bash
# Confere NO PRÓPRIO BUNNY que o endereço do CDN da biblioteca de vídeos, escrito no
# cloud-run.yaml, existe e aceita o site (P105, 24/10/2026). Roda no CI, antes de tudo.
#
# Por que existe: na mudança para o Google (etapa G2) esse endereço foi reescrito à mão
# com um valor que o Bunny não conhece. Nada reprovou: a miniatura do editor de aulas
# sumiu sem erro e a limpeza de cache da legenda passou a dar 404. Um teste do código
# não sabe qual é o endereço certo; só o Bunny sabe — por isso a pergunta vai a ele.
#
# Como pergunta: pede um arquivo que não existe, dizendo vir do site. Endereço certo e
# site aceito = 404 (a zona existe, o arquivo não). Endereço que o Bunny não conhece, ou
# site recusado pelos domínios permitidos = 403. Medido em 24/10/2026. Sem chave nenhuma.
set -euo pipefail

ARQUIVO="${1:-deploy/cloud-run.yaml}"
ler() { sed -n "s/^$1: *\"\\([^\"]*\\)\".*/\\1/p" "$ARQUIVO"; }

HOST="$(ler BUNNY_STREAM_LESSONS_CDN_HOST)"
SITE="$(ler BASE_URL)"

if [[ ! "$HOST" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ ]]; then
  echo "BUNNY_STREAM_LESSONS_CDN_HOST ausente ou fora do formato em $ARQUIVO" >&2
  exit 1
fi
if [[ -z "$SITE" ]]; then
  echo "BASE_URL ausente em $ARQUIVO" >&2
  exit 1
fi

STATUS="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 20 --retry 2 \
  -H "Referer: $SITE/" "https://$HOST/conferencia-do-ci/thumbnail.jpg")"

if [[ "$STATUS" != "404" ]]; then
  echo "O Bunny respondeu $STATUS para $HOST (esperado 404)." >&2
  echo "Confira o CDN Hostname em Bunny → Stream → jilsonsantana-stream → API (docs/bunny.md)." >&2
  exit 1
fi
echo "Bunny: o endereço do CDN ($HOST) existe e aceita $SITE."
