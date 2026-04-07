# MessageG0d (MG)

MG is a real-time messaging and community platform.

This repository now includes an implementation-ready backend foundation generated from the product specification.

## Repository layout

- `docs/MG_DEVELOPER_SPEC.md` — canonical product/developer specification
- `backend/schema.sql` — initial PostgreSQL schema (users, DMs, servers, roles, channels, feature flags)
- `backend/openapi.yaml` — initial OpenAPI 3.1 contract for key auth/user/server endpoints
- `backend/src/permissions.ts` — role permission bitmask constants + helper
- `.github/ISSUE_TEMPLATE/*` — GitHub issue templates
- `.github/pull_request_template.md` — GitHub PR template

## Quick start (backend foundation)

1. Review the domain model in `backend/schema.sql`.
2. Apply schema to PostgreSQL (example):
   ```bash
   psql "$DATABASE_URL" -f backend/schema.sql
   ```
3. Use `backend/openapi.yaml` as the API contract baseline for service implementation.

## Status

This is an initial, spec-aligned foundation. Runtime services, migrations, and WebSocket workers should be implemented next.
