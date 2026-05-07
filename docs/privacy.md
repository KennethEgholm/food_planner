---
title: Privacy Policy — Food Planner
---

# Privacy Policy

_Last updated: 7 May 2026_

Food Planner ("the application") is a personal-use meal-planning tool operated by Kenneth Egholm. This page describes what data the application collects, how it is used, and how you can have it removed.

## 1. Who is the data controller

Kenneth Egholm — contact: **kenneth.egholm@gmail.com**.

## 2. Who can use the application

Access to the application is restricted via Cloudflare Access. Only individuals explicitly invited by the operator can sign in. The application is not available to the general public.

## 3. What data is collected

The application processes the following categories of data:

- **Identity (from sign-in):** Your email address, provided to the application by Cloudflare Access after you authenticate with Google through Cloudflare. No password is stored.
- **Google Tasks credentials (only if you opt in):** If you click "Connect Google Tasks", Google issues OAuth tokens (an access token and a refresh token) scoped to `https://www.googleapis.com/auth/tasks`. These tokens are stored in the application's database and used solely to create task lists and tasks in **your own** Google Tasks account when you ask the application to export a shopping list.
- **Application content you create:** Meals, snacks, ingredients, meal plans, settings, and any images you upload. This data is stored in the application's database and file storage.
- **Server logs:** Standard request and error logs (timestamps, paths, status codes, error messages) used for debugging and abuse prevention. These may incidentally contain your email address.

The application does **not** use third-party analytics, advertising, or tracking pixels.

## 4. How the data is used

- To authenticate you and authorise read/write actions inside the application.
- To store and display the content you create.
- To call the Google Tasks API on your behalf, only when you explicitly trigger an export.
- To diagnose errors and maintain the service.

Your data is **not** sold, rented, or shared with third parties for marketing.

## 5. Where the data is stored

- Application data and Google OAuth tokens are stored in a PostgreSQL database on infrastructure controlled by the operator.
- Uploaded images are stored on the application server's file system.
- Network traffic to the application is proxied by Cloudflare. Cloudflare may process request metadata (IP address, user agent, request paths) under its own privacy terms.

## 6. Third parties involved

- **Google** — provides the OAuth identity and the Google Tasks API used to create task lists when you choose to export. See Google's own privacy policy for how Google handles its part of this interaction.
- **Cloudflare** — provides the Access gateway and reverse proxy that fronts the application.

The application does not transmit your data to any other third party.

## 7. Use of Google user data

If you connect Google Tasks, the application requests only the `tasks` scope. With that scope it:

- Creates a new task list in your Google Tasks account when you export a shopping list.
- Creates individual tasks inside that list.

The application does **not** read your existing Google Tasks, calendar, contacts, mail, drive, or any other Google data, and it does not share any data obtained from Google with anyone else. Use of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

You can revoke the application's access to your Google account at any time at [https://myaccount.google.com/permissions](https://myaccount.google.com/permissions). You can also click "Disconnect Google" inside the application to delete the stored tokens from the application's database.

## 8. Retention

- Application content (meals, plans, etc.) is retained until you or the operator delete it.
- Google OAuth tokens are retained until you click "Disconnect Google", until they are invalidated by Google, or until your account is removed.
- Server logs are retained for a short operational window (on the order of weeks) and then rotated out.

## 9. Your rights

You can at any time:

- Request a copy of the data the application holds about you.
- Request correction or deletion of that data.
- Disconnect Google Tasks via the in-app button or via [Google account permissions](https://myaccount.google.com/permissions).
- Request that your account be removed entirely.

Contact **kenneth.egholm@gmail.com** for any of the above. Requests are handled manually and answered within a reasonable time.

## 10. Children

The application is not directed at children and is only made available to specifically invited individuals.

## 11. Changes

This policy may be updated; the "Last updated" date above will reflect any change. The current version is always at this URL.

---

See also: [Terms of Service](terms).
