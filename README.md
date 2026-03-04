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

### Run the app locally:
- cd client && npm run dev
- cd server && npm run dev
