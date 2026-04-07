# MessageG0d (MG)

MG is a real-time messaging and community platform.

## Fastest setup (2 commands)

```bash
npm run setup
npm start
```

Server starts at `http://localhost:3000`.

## Verify it works

```bash
npm run smoke
```

## Useful commands

- `npm run setup` — checks local requirements and prints next steps
- `npm start` — starts the backend API server
- `npm run check` — syntax-checks backend server code
- `npm run smoke` — end-to-end smoke test (health/register/login/create server)

## Project layout

- `backend/src/server.js` — runnable in-memory API prototype
- `backend/schema.sql` — PostgreSQL schema draft
- `backend/openapi.yaml` — API contract baseline
- `backend/FEATURE_MATRIX.md` — feature-to-implementation map
- `docs/MG_DEVELOPER_SPEC.md` — canonical specification
