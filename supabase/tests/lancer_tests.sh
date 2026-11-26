#!/usr/bin/env bash
# Lance les scénarios SQL sur un PostgreSQL local jetable (PostgreSQL 15+ requis).
# Usage : supabase/tests/lancer_tests.sh   (PG_BIN=/chemin/vers/bin si initdb n'est pas dans le PATH)
set -euo pipefail
cd "$(dirname "$0")/.."
BIN=${PG_BIN:-$(dirname "$(command -v initdb || ls /usr/lib/postgresql/*/bin/initdb | tail -1)")}
DIR=$(mktemp -d)
trap '"$BIN/pg_ctl" -D "$DIR/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT
"$BIN/initdb" -D "$DIR/data" -A trust -U postgres >/dev/null
"$BIN/pg_ctl" -D "$DIR/data" -o "-k $DIR -p 5499 -c listen_addresses=" -l "$DIR/log" -w start >/dev/null
P="psql -h $DIR -p 5499 -U postgres -d postgres -v ON_ERROR_STOP=1 -q"
$P -o /dev/null -f tests/stubs_supabase.sql
for m in migrations/*.sql; do $P -1 -o /dev/null -f "$m"; done
$P -f tests/scenarios.sql | grep -E "PASSENT"
