# Wudapp

Local-network messaging, media sharing, and calls — built for LAN / hotspot use, max ~10 users.

## Stack

| Layer        | Technology                                  |
| ------------ | ------------------------------------------- |
| Mobile       | React + TypeScript + Vite + Capacitor       |
| Server       | Fastify + TypeScript + Drizzle ORM          |
| Database     | SQLite (WAL mode, better-sqlite3)           |
| Real-time    | Socket.IO                                   |
| Calls        | WebRTC mesh (server handles signaling only) |
| Shared types | `@wudapp/types` workspace package           |

## Monorepo layout

```
wudapp/
├── apps/
│   ├── mobile/          React + Vite frontend → Capacitor APK
│   └── server/          Fastify backend + Socket.IO + Drizzle
└── packages/
    └── types/           Shared TypeScript contracts (API, socket, domain)
```

## Version convention

`V1.MINOR.FILE_COUNT`

- **V1** — locked until all V1 features compile and run
- **MINOR** — increments per fix/feature session; PR dev → main on each minor bump
- **FILE_COUNT** — per-file counter within a minor, never resets (1 → 2 → … → 89)

### Commit flow

**First file of a minor (v1.x.1):**

```bash
git add <file>
git commit -m "(type): describe the session"
git tag v1.x.1 -m "Added/Fixed/Removed ..."
git push origin dev --follow-tags
```

**Every subsequent file (v1.x.2+):**

```bash
git add <file>
git commit --amend --no-edit
git tag v1.x.2 -m "Added/Fixed/Removed ..."
git push origin dev --follow-tags --force-with-lease
```

**After all files in a minor are tagged → open PR dev → main.**

## Quick start

```bash
pnpm install
cp apps/server/.env.example apps/server/.env
pnpm dev
```

Server runs on `http://0.0.0.0:3001`  
Mobile dev server on `http://localhost:5173`  
Health check: `GET /health`

## Seeding users (no auth yet)

The server auto-seeds real users on startup if the DB is empty.  
Seed data lives in `apps/server/src/db/seed.ts`.

## Environment

```env
PORT=3001
HOST=0.0.0.0
JWT_SECRET=<min 32 chars>
DATABASE_PATH=./wudapp.db
UPLOADS_DIR=./uploads
MAX_IMAGE_BYTES=10485760
MAX_VIDEO_BYTES=104857600
MAX_VOICE_BYTES=26214400
```

## Repo

`https://github.com/picklem0b/wudapp.git`  
Branch: `dev` (active) → `main` (stable, merged per minor)

# DEPRICATED
