#!/bin/sh
if ! command -v bash >/dev/null 2>&1; then
  apk update
  apk add bash
fi
if ! command -v jq >/dev/null 2>&1; then
  apk update
  apk add jq
fi
if ! command -v psql >/dev/null 2>&1; then
  apk update
  apk add postgresql15-client
fi

/opt/vault/init.sh