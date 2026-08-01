# taha-training-log

Personal training log built with Next.js, Drizzle, and Neon Postgres.

## Setup

```bash
npm install
# fill in .env.local
npm run dev
```

## Deploy

```bash
git push origin main
# Vercel auto-deploys on push
```

## Env vars needed in Vercel

- `DATABASE_URL` — Neon connection string
- `LOG_PASSWORD` — app password
- `AUTH_SECRET` — random 32-char string for HMAC signing
