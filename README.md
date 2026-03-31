# Food Planning App
This is a food planning app that allows users to create and manage their meal plans. The app is built using React and Node.js, and it integrates with the Google Tasks API to allow users to create and manage their meal plans. The shopping list for a meal plan can be sent to Google Tasks.

## Authorization

The app enforces a two-tier role system:

| Role | Access |
|------|--------|
| `ADMIN` | Full create, read, update, delete access |
| `USER` | Read-only access |

### How it works
- All traffic goes through **Cloudflare Access**, which authenticates users via Google OAuth.
- Cloudflare injects a signed JWT (`CF-Access-Jwt-Assertion`) on every request. The server verifies this JWT with Cloudflare's public keys.
- User roles are stored in the `users` database table. A new user's role defaults to `USER`.
- The first admin is bootstrapped via the `BOOTSTRAP_ADMIN_EMAIL` environment variable.
- In development (`NODE_ENV !== "production"`), JWT verification is bypassed and `BOOTSTRAP_ADMIN_EMAIL` is used as a mock admin.

### Required environment variables (production)
```
CF_TEAM_DOMAIN=myteam.cloudflareaccess.com   # Cloudflare Access team domain
CF_AUD=<audience-tag>                         # Cloudflare Access Application Audience Tag
BOOTSTRAP_ADMIN_EMAIL=you@example.com         # Email to grant ADMIN on first login
```

Find the Audience Tag in the Cloudflare Zero Trust dashboard → Access → Applications → your app → Overview.

## Google Tasks API Integration
This project is created on my personal google account: https://console.cloud.google.com/auth/overview?project=foodplanning-488211

## Routing & Deep Linking

The app uses client-side routing (`react-router-dom`). Each tab has its own URL:

| URL | Content |
|---|---|
| `/plans` | Meal Plans tab |
| `/plans/:id` | Meal Plans tab — auto-opens the modal for plan `id` |
| `/meals` | Meals tab |
| `/snacks` | Snacks tab |
| `/ingredients` | Ingredients tab |

Navigating directly to `/plans/42` will load the plans list and immediately open the detail modal for plan 42. Closing the modal navigates back to `/plans`.

Nginx is already configured with `try_files ... /index.html` so all routes are served correctly in production.

### Deploy to production
Use the `deploy.sh` script instead of calling `docker compose` directly. It automatically backs up the database before deploying:

```bash
./deploy.sh
```

What it does:
1. Dumps the running PostgreSQL database to `backups/food_planner_<timestamp>.sql.gz`
2. Retains the 10 most recent backups (older ones are pruned automatically)
3. Runs `docker compose -f docker-compose.prod.yml up --build -d`

If the database container is not running (e.g. first ever deploy), it asks for confirmation before proceeding without a backup.

To restore from a backup:
```bash
gunzip -c backups/food_planner_<timestamp>.sql.gz | \
  docker exec -i food_planner_db psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

### AI usage: Grok
Console: https://console.x.ai/team/111e5b4c-e96e-41f6-9df2-a969182e6033

### Run the app locally:
- cd client && npm run dev
- cd server && npm run dev
