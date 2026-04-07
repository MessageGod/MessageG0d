#!/usr/bin/env bash
set -euo pipefail

node backend/src/server.js >/tmp/mg_server.log 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT
sleep 1

curl -sSf http://127.0.0.1:3000/health >/dev/null

REGISTER=$(curl -sSf -X POST http://127.0.0.1:3000/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"smoke@example.com","username":"smokeuser","password":"pass12345"}')

TOKEN=$(curl -sSf -X POST http://127.0.0.1:3000/auth/login \
  -H 'content-type: application/json' \
  -d '{"identifier":"smokeuser","password":"pass12345"}' \
  | python -c 'import sys,json; print(json.load(sys.stdin)["token"])')

curl -sSf -X POST http://127.0.0.1:3000/servers \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"name":"Smoke Server"}' >/dev/null

echo "✅ Smoke passed"
echo "$REGISTER" >/dev/null
