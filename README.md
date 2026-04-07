# MessageG0d (MG)

MG is a real-time messaging and community platform.

This repository includes a working backend starter plus specification artifacts.

## Repository layout

- `docs/MG_DEVELOPER_SPEC.md` — canonical product/developer specification
- `backend/src/server.js` — runnable HTTP API server (no external dependencies)
- `backend/schema.sql` — initial PostgreSQL schema (users, DMs, servers, roles, channels, feature flags)
- `backend/openapi.yaml` — initial OpenAPI 3.1 contract for key endpoints
- `backend/src/permissions.js` — role permission bitmask constants + helper
- `.github/ISSUE_TEMPLATE/*` — GitHub issue templates
- `.github/pull_request_template.md` — GitHub PR template

## Quick start (run code now)

```bash
node backend/src/server.js
```

Server starts on `http://localhost:3000` (override with `PORT`).

### Minimal API smoke test

```bash
curl http://localhost:3000/health
curl -X POST http://localhost:3000/auth/register -H 'content-type: application/json' -d '{"email":"a@example.com","username":"alice","password":"password123"}'
curl -X POST http://localhost:3000/auth/login -H 'content-type: application/json' -d '{"identifier":"alice","password":"password123"}'
```

## Status

This is an initial, spec-aligned foundation. Next steps: persistent storage wiring, JWT sessions, WebSocket events, and migrations.
