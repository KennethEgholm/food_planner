# Food Planner
## Overview
Food Planner is a web application designed to help users plan their meals for the week. It allows users to create meal plans and  generate shopping lists.
## Features
- **Meal Plan**: 
    - Users can create meal plans for each day of the week. Dinner only.
    - Users can add meals to the weekend days that are marked as "Suitable for Lunch".
    - User can choos to have nothing selected for any given day.
    - A meal plan can be generated "randomly".
    - Only meals marked "Suitable for weekends" will be selected for Saturday and Sunday when generating a meal plan randomly.
    - A meal plan can have zero or more snacks associated with it.

- **Ingredient Management**: 
    - Meals have associated ingredients.
    - An ingredient can be associated with multiple meals.
    - An ingredient has a name and a unit.
        - Units can be one of: 
            - gram
            - centiliter
            - deciliter
            - stk
    - An ingredient has a measure: calories per 100g. This is used to calculate the total calories of a meal based on its ingredients and their quantities.
    - The calories per 100g will be autofilled by asking the configured AI model (e.g. OpenAI) when an ingredient is created or updated, but the user can override it if they want to.

- **Meals**: 
    - A meal can be marked "Suitable for weekends".
    - A meal can be marked as "Suitable for Lunch".
    - Users can create meals and associate them with ingredients. A meal has a name and a list of ingredients with their respective quantities.
    - A meal can have zero to many images attached to it. The images are shown as thumbnails and when pressed the image is shown in full size. The full-size image overlay closes when clicked or when the [ESC] key is pressed.
    - Uploaded images must be stored as files in a folder on the server.
    - A meal has a badge: "Low Calorie", "Medium Calorie", "High Calorie". The badge is determined by the total calories of the meal, which is calculated based on the calories of its ingredients and their quantities.
    - A meal also shows the number of calories/100g.
    - Meal usage stats: The app should track how many meal plans each meal is part of, and display this count in the meals list. This helps users identify their most frequently used meals.
- **Snacks**: 
    - Snacks are a category similar to meals. They also consist of ingredients.
    - A snack can have zero to many images attached to it. The images are shown as thumbnails and when pressed the image is shown in full size. The full-size image overlay closes when clicked or when the [ESC] key is pressed.
    - Uploaded images must be stored as files in a folder on the server.

- **Shopping List Generation**: 
    - Users can generate a shopping list based on their meal plan, which aggregates the required ingredients and their quantities for the week.
    - The shopping list can be shared with Google Tasks by uploading it via their API.

- **Settings**: 
    - Users can configure the AI model used for autofilling ingredient calories as well as meal images. Eg API key and model name.

## Technical Specifications
- **Frontend**: React.js for building the user interface. Must be fully functional on a mobile device.
- **Backend**: Node.js with Express for handling API requests and managing data.
- **Database**: PostgreSQL (via Prisma ORM) for storing meal plans, meals, and ingredients.
- **API**: RESTful API for communication between the frontend and backend.
- The application uses a monorepository structure, with separate folders for the frontend and backend code.
- Typescript is used for both frontend and backend development to ensure type safety and improve code quality.
- Application is containerized using Docker to ensure consistency across different environments and simplify deployment.

## Routing & Deep Linking

The app uses `react-router-dom` (v7) with `BrowserRouter` for client-side routing. Tab navigation is URL-based, enabling bookmarking and sharing.

| URL | Behaviour |
|---|---|
| `/` | Redirects to `/current-plan` |
| `/current-plan` | Current Meal Plan tab |
| `/plans` | Meal Plans tab |
| `/plans/:id` | Meal Plans tab with the specified plan's modal auto-opened |
| `/meals` | Meals tab |
| `/meals/:id` | Meals tab with the specified meal's modal auto-opened |
| `/snacks` | Snacks tab |
| `/ingredients` | Ingredients tab |

Deep linking to a meal plan (`/plans/:id`) opens the plan's detail modal automatically and navigates back to `/plans` when the modal is closed. Clicking a plan name in the list updates the URL to `/plans/:id`, making the link shareable.

## Authorization

### Overview
The app uses a two-tier role system:

| Role | Permissions |
|------|-------------|
| `ADMIN` | Full CRUD access to all resources |
| `USER` | Read-only access (GET endpoints only) |

### Authentication & Identity
Authentication is handled entirely by **Cloudflare Access** in front of the app, using Google as the OAuth identity provider. Users must pass through Cloudflare before reaching the application. Cloudflare injects a signed JWT (`CF-Access-Jwt-Assertion` request header) that the server verifies on every request.

### Authorization Flow
1. The `verifyCloudflareJWT` Express middleware (applied globally in `server/index.ts`) verifies the Cloudflare JWT using Cloudflare's public JWKS endpoint.
2. The user's email is extracted from the verified token and used to look up or create a `users` record in the database.
3. New users are provisioned with the `USER` role by default. The `BOOTSTRAP_ADMIN_EMAIL` environment variable grants `ADMIN` role on first login.
4. `req.user` is populated with `{ email, role }` for downstream route handlers.
5. Write endpoints (POST, PUT, DELETE) additionally require the `requireAdmin` middleware, which returns `403` for non-admin users.

### Google OAuth app
The application uses a separate Google OAuth client (distinct from the Cloudflare Access SSO flow) to obtain per-user access to the Google Tasks API. Configuration lives in the Google Cloud Console under **APIs & Services → OAuth consent screen** and **→ Credentials**.

**Consent screen requirements**

The consent screen must have a publicly reachable "Application privacy policy link" and "Application terms of service link". Because the application itself is gated behind Cloudflare Access, those URLs cannot point at the app. Instead, the policies are published via GitHub Pages from the `docs/` folder of this public repository (source of truth: [`docs/privacy.md`](../docs/privacy.md), [`docs/terms.md`](../docs/terms.md)).

Canonical public URLs (after enabling Pages: repo → Settings → Pages → Source: `main` / `/docs`):

| Field | URL |
|---|---|
| Privacy policy link | `https://kennethegholm.github.io/food_planner/privacy` |
| Terms of service link | `https://kennethegholm.github.io/food_planner/terms` |

**Publishing status**

The OAuth consent screen must be set to **"In production"** (i.e. published, not "Testing"). While the consent screen is in Testing mode, Google issues refresh tokens that expire after 7 days, which causes `invalid_grant` errors in the Google Tasks export flow. Publishing the app is required even though the user list is restricted by Cloudflare Access.

**Scopes requested**

Only `https://www.googleapis.com/auth/tasks` — used solely to create a new task list and tasks in the signed-in user's Google Tasks when they explicitly trigger an export.

**Token storage**

Per-user OAuth tokens (access + refresh) are stored in the `user_google_tokens` table, keyed by user email. The `Disconnect Google` button in the shopping list modal calls `DELETE /api/auth/google/disconnect` and deletes the row.

### Database
User records are stored in a `users` table:
- `email` (primary key, from Cloudflare JWT)
- `role` (enum: `ADMIN` | `USER`, default `USER`)
- `created_at`

Admin users can be managed directly in the database (or via a future admin API).

### Environment Variables
| Variable | Purpose |
|---|---|
| `CF_TEAM_DOMAIN` | Your Cloudflare Access team domain (e.g. `myteam.cloudflareaccess.com`) |
| `CF_AUD` | Cloudflare Access Application Audience Tag |
| `BOOTSTRAP_ADMIN_EMAIL` | Email address that receives `ADMIN` role on first login |

### Development (Local)
In `NODE_ENV !== "production"`, Cloudflare JWT verification is bypassed. The email in `BOOTSTRAP_ADMIN_EMAIL` (or `dev@localhost` if unset) is used as a mock admin user, upserted automatically.

## User Stories
1. As a user, I want to create a meal plan for the week so that I can organize my meals.
2. As a user, I want to add meals to my meal plan so that I can specify what I will eat each day.
3. [x] As a user, I want to be able to have a plan created for me with random choices of meals so that I can have a plan without having to choose meals myself.
4. As a user, I want to be able to view my meal plan so that I can see what I will be eating each day.
5. As a user, I want to generate a shopping list based on my meal plan so that I can easily shop for the ingredients I need.
6. [x] As a user, I want to be able to CRUD ingredients.
7. [x] As a user, I have to be able to CRUD meals.
8. [x] As a user, I want to be able to CRUD meal plans.
