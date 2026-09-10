# Ideas for the fututre of this project:
    - Add a button in the "Add Meal Plan" modal, saying: "AI Create". This will generate a meal plan where an AI model is asked to put the plan together based on a "preference setting" in the settings page, and the existing Meal Plans as context. The "preference setting" can be used to influence which meals are apppropriate for the different seasons of the year, and weekend/weekday.
    
## Code audit suggestions (2026-09-10)

### Security
- [x] Unsigned base64 OAuth state (account takeover/linking) — fixed in 4658c13
- [x] Fail-open auth: `NODE_ENV !== "production"` bypasses JWT (`server/middleware/auth.ts:34`) — now requires `NODE_ENV=development` + `AUTH_DEV_BYPASS=true`
- [x] `/uploads` mounted before auth (`server/index.ts:21`) + multer has no `fileFilter`/`limits` → fixed: static moved behind auth, raster-only filter, 10 MB limit, MIME-derived filenames, nosniff
- [x] IDOR: `DELETE /meals/:id/images/:imageId` ignores parent id — now scoped to parent meal/snack
- [x] `GET /settings` returns AI API keys in plaintext — now redacted (`value: null` + `has_value`), blank PUT keeps stored key; legacy `google_tokens` setting also redacted
- [x] Google tokens stored as plaintext JSON (`user_google_tokens`) — now AES-256-GCM encrypted (`TOKEN_ENCRYPTION_KEY`); legacy rows are read as plaintext and encrypted on next write
- [x] Wide-open CORS, no `express.json` size limit, no rate limiting — CORS allowlist via `CORS_ORIGIN`, 1 MB JSON limit, 1000 req/15 min limiter
- [x] 500s leak stack traces — generic 5xx messages; multer/file-filter errors are 400s
- [x] Env loading order bug: `dotenv.config` runs after imports; root `.env` vs `server/.env` inconsistency — loaded in `server/env.ts`, imported first
- [x] `npm audit`: 14 vulnerabilities (2 critical) in server deps — 0 after fixes + `deepmerge-ts` override; client also 0

### Correctness / bugs
- [x] `CurrentMealPlan.tsx` can infinite-loop retrying `generate-image` on failure — fixed in 43db849
- [x] `plan_count` counts dinner only, ignores weekend lunches (`meals.ts:147`) — now dinner + lunch
- [x] Snack ingredient add uses `create` (500 on duplicate) vs meal `upsert` — now upsert
- [x] Missing 404s: deleting missing meal/plan maps P2025 → 500 — deletes/updates now 404
- [x] Duplicate DOM ids in `EditIngredient`/`InputIngredient` — fixed in 43db849
- [x] `suitable_for_weekend` mixed boolean/1/0 handling — `parseBoolean` on the server + boolean-safe client init
- [x] Unused `_setCaloriesPer100g` state; no calorie override in `InputIngredient` — fixed in 43db849

### Maintainability / hygiene
- [x] ~70% duplication: server side deduped (`utils/aiImages.ts`, `utils/calories.ts`, `DAY_ORDER`, `getShoppingList`)
- [x] Client form duplication — `MealForm`/`SnackForm` are now thin wrappers over a shared `FoodItemForm` (~620 lines removed; also fixed the duplicated `snack-name` DOM id)
- [x] No client `tsconfig.json`; build doesn't typecheck; ESLint only covers `.js/.jsx` — tsconfig + `tsc --noEmit` on build + typescript-eslint
- [x] Dead code: `main.jsx`, `InputMeal/EditMeal/InputSnack/EditSnack`, stale `server/dist`, committed `.db` files, unused assets
- [x] `window.location.reload()` after mutations (16 places), no delete confirmations (also in TODO) — refresh event bus + `window.confirm`
- [x] Doc/spec drift: `CLAUDE.md` references nonexistent `aiImages.ts`; spec says SQLite/react-router v6; day names English vs Danish; broken root `deploy` script
- [x] `actions/checkout` Node 20 deprecation — fixed in d60b2c6

### Also done
- [x] Google Tasks connect/disconnect moved to Settings, export gated on connection (8afb5ea)
- [x] Visual overhaul: selectable themes (Warm Kitchen / Fresh Market / Dark Bistro), header nav, card grids, week view, checklist shopping list (43db849)
