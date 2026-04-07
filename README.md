# MessageG0d (MG)

MG is a real-time messaging and community platform.

This repository now includes a runnable backend prototype that covers all major systems in your specification.

## Repository layout

- `docs/MG_DEVELOPER_SPEC.md` — canonical product/developer specification
- `backend/src/server.js` — runnable HTTP API prototype (in-memory)
- `backend/FEATURE_MATRIX.md` — feature-to-implementation coverage map
- `backend/schema.sql` — PostgreSQL schema draft
- `backend/openapi.yaml` — API contract baseline
- `backend/src/permissions.js` — permission bitmask constants + helper

## Run

```bash
node backend/src/server.js
```

Server runs at `http://localhost:3000`.

## Quick checks

```bash
curl http://localhost:3000/health
```

## Important

This prototype implements the feature surface area now, with in-memory storage for speed. Next hardening steps: DB wiring, JWT rotation, WebSockets, queues, S3 media integration, and production-grade permission enforcement.
