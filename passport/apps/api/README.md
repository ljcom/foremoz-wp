# Passport API (MVP baseline)

API ini menyiapkan command + projection + read endpoint untuk domain `passport.foremoz.com`.

## Setup

```bash
cd passport/apps/api
npm install
cp .env.example .env
npm run db:read-model
npm run dev
```

## Key Endpoints

- `GET /health`
- `POST /v1/passport/create`
- `POST /v1/subscriptions/create`
- `POST /v1/performance/log`
- `POST /v1/consents/grant`
- `POST /v1/consents/revoke`
- `POST /v1/pricing/plan/change`
- `POST /v1/projections/run`
- `GET /v1/read/profile`
- `GET /v1/read/subscriptions`
- `GET /v1/read/performance`
- `GET /v1/read/consents`
- `GET /v1/read/coach-shared-view`
