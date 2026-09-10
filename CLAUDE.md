# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Setup

This is a TypeScript monorepo with a React frontend (`client/`) and Express backend (`server/`), using PostgreSQL via Prisma ORM. All services run via Docker Compose.

### Starting the stack

```bash
docker compose up          # starts postgres, server (port 5001), client (port 5173)
```

The server container auto-runs `npx prisma migrate deploy && npm run dev`. The client container runs `npm install && npm run dev -- --host`.

### Running outside Docker

```bash
# Terminal 1 - server (requires local postgres matching .env DATABASE_URL)
cd server && npm run dev    # tsx watch + tsc --noEmit --watch

# Terminal 2 - client
cd client && npm run dev    # vite dev server on port 5174, proxies /api to localhost:5001
```

### Key commands

| Task | Command |
|------|---------|
| Server typecheck | `cd server && npm run typecheck` |
| Client lint | `cd client && npm run lint` |
| Client build | `cd client && npm run build` |
| Run Prisma migration | `cd server && npx prisma migrate dev --name <name>` |
| Generate Prisma client | `cd server && npx prisma generate` |
| Deploy migrations | `cd server && npx prisma migrate deploy` |
| Production deploy | `npm run deploy` (runs `deploy.sh`, uses GitHub Actions self-hosted runner) |

There is no test suite.

## Architecture

### Client (React 19 + Vite + React Router)

- Entry: `client/src/main.tsx` -> `client/src/App.jsx`
- Routes defined in `App.jsx`: `/current-plan`, `/plans`, `/plans/:id`, `/meals`, `/snacks`, `/ingredients`, `/settings`
- Components in `client/src/components/` - each page is a component, no shared state management (local useState only)
- All API calls use Axios to `/api/*` (proxied to server by Vite dev server or Nginx in prod)

### Server (Express 5 + Prisma + PostgreSQL)

- Entry: `server/index.ts` - sets up middleware, mounts route modules, global error handler
- Routes in `server/routes/`: `meals.ts`, `mealPlans.ts`, `snacks.ts`, `ingredients.ts`, `settings.ts`, `auth.ts`
- Prisma schema: `server/prisma/schema.prisma`
- Uploaded files stored in `server/uploads/`, served statically at `/uploads/*`

### Authentication

- Cloudflare Access JWT verification on all routes (middleware in `server/index.ts`)
- In development, JWT check is bypassed only when both `NODE_ENV=development` and `AUTH_DEV_BYPASS=true`; uses `BOOTSTRAP_ADMIN_EMAIL` as mock admin (fails closed otherwise)
- Uploaded files under `/uploads` are served behind the auth middleware (`X-Content-Type-Options: nosniff`); uploads are limited to raster images (no SVG), max 10 MB, extension derived from MIME type
- `GET /settings` never returns API key values (only `has_value`); blank secret values on `PUT` keep the stored key
- Two roles: `ADMIN` (full CRUD) and `USER` (read-only / GET only)
- Google OAuth for Google Tasks API integration (per-user tokens stored in DB)

### AI Features (server/utils/)

- `aiCalories.ts` - auto-fills calories per 100g for ingredients via AI (fire-and-forget)
- `aiMealPlan.ts` - generates 7-day meal plans using AI, respects weekend/lunch tags
- `aiImages.ts` - generates representative images for meals/snacks (fire-and-forget)
- AI provider configured via `app_settings` table (defaults to xAI/Grok)

### Database

PostgreSQL 15. Core entities: `meals`, `snacks`, `ingredients`, `meal_plans`. Junction tables: `meal_ingredients`, `snack_ingredients`, `meal_plan_days` (has both `meal_id` for dinner and `lunch_meal_id` for lunch), `meal_plan_snacks`. Settings stored in `app_settings` key-value table.

### Production

Docker Compose (`docker-compose.prod.yml`) with Nginx serving the client, Cloudflare Tunnel for reverse proxy. Deploy via GitHub Actions self-hosted runner.

## Conventions

- Server uses `tsx` for runtime TypeScript execution (no compile step needed)
- API route handlers check `req.user.role === 'ADMIN'` for write operations
- Prisma client is instantiated in `server/prisma/client.ts` and imported throughout
- Meal plan days use string day names: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" (English)
- Ingredient units are: "gram", "centiliter", "deciliter", "stk"
- The spec is in `specs/spec.md`; `specs/TODO.md` contains unapproved ideas (do not implement from TODO without approval)
