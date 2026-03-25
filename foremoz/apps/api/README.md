# Foremoz Fitness API (MVP start)

API ini adalah lapisan domain untuk fitness operations di atas EventDB write layer.
Mode terbaru memprioritaskan creator-led event flow (`creator -> event -> participant`) dan tetap mempertahankan institution operations sebagai layer lanjutan.

## Fitur awal

- Append event domain:
  - creator event lifecycle (create/publish/register/check-in/complete)
  - member
  - member auth (signup/signin via JWT)
  - subscription
  - payment
  - checkin
  - class booking
  - PT session
- Run projection ke read model (`read.rm_*`).
- Query endpoint read model utama.

## Menjalankan

```bash
cd foremoz/apps/api
npm install
cp .env.example .env
npm run db:read-model
npm run dev
```

Pastikan `DATABASE_URL` menunjuk database EventDB yang sama dengan service di root workspace: `eventdb/mvp-node`.

Tambahkan konfigurasi JWT di `.env`:

```bash
JWT_SECRET=dev-change-this-secret
JWT_ISSUER=foremoz-fitness-api
JWT_AUDIENCE=foremoz-fitness-member
JWT_EXPIRES_IN_SEC=86400
```

Aktifkan pengiriman email (signup + registrasi event/walk-in) di `.env`:

```bash
EMAIL_ENABLED=true
EMAIL_FROM_ADDRESS=no-reply@yourdomain.com
EMAIL_FROM_NAME=Foremoz
EMAIL_REPLY_TO=support@yourdomain.com
EMAIL_SMTP_HOST=smtp.your-provider.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_SECURE=false
EMAIL_SMTP_USER=your_smtp_username
EMAIL_SMTP_PASS=your_smtp_password
EMAIL_SMTP_IGNORE_TLS_ERRORS=false
```

## Endpoint utama

- `POST /v1/auth/signup`
- `POST /v1/auth/signin`
- `GET /v1/auth/me` (Bearer token)
- `POST /v1/tenant/auth/signup`
- `POST /v1/tenant/auth/signin`
- `GET /v1/owner/setup`
- `POST /v1/owner/setup/save`
- `DELETE /v1/owner/setup`
- `POST /v1/owner/account/delete` (danger zone)
- `GET /v1/owner/users`
- `POST /v1/owner/users`
- `PATCH /v1/owner/users/:userId`
- `DELETE /v1/owner/users/:userId`
- `GET /v1/owner/saas`
- `POST /v1/owner/saas/extend`
- `GET /v1/owner/branches`
- `POST /v1/owner/branches`
- `PATCH /v1/owner/branches/:branchId`
- `POST /v1/owner/branches/:branchId/deactivate`
- `POST /v1/owner/branches/:branchId/reactivate`
- `POST /v1/members/register`
- `POST /v1/events/create`
- `POST /v1/events/register`
- `POST /v1/events/checkin`
- `POST /v1/events/complete`
- `GET /v1/public/events`
- `GET /v1/public/events/:eventSlug`
- `POST /v1/subscriptions/activate`
- `POST /v1/payments/record`
- `POST /v1/payments/:paymentId/confirm`
- `POST /v1/payments/:paymentId/reject`
- `POST /v1/checkins/log`
- `POST /v1/bookings/classes/create`
- `POST /v1/bookings/classes/:bookingId/cancel`
- `POST /v1/bookings/classes/:bookingId/attendance-confirm`
- `POST /v1/pt/packages/assign`
- `POST /v1/pt/sessions/book`
- `POST /v1/pt/sessions/:ptPackageId/complete`
- `POST /v1/pt/activity/log`
- `POST /v1/projections/run`
- `GET /v1/read/members`
- `GET /v1/read/events`
- `GET /v1/read/event-registrations`
- `GET /v1/read/creator-growth`
- `GET /v1/read/subscriptions/active`
- `GET /v1/read/class-availability`
- `GET /v1/read/bookings`
- `GET /v1/read/payments/queue`
- `GET /v1/read/payments/:paymentId/links`
- `GET /v1/read/pt-balance`
- `GET /v1/read/dashboard`

## Auth payload ringkas

`POST /v1/auth/signup`

```json
{
  "tenant_id": "tn_001",
  "member_id": "mem_001",
  "full_name": "Member One",
  "phone": "+62812xxxx",
  "email": "member1@example.com",
  "password": "supersecret123"
}
```

`POST /v1/auth/signin`

```json
{
  "tenant_id": "tn_001",
  "email": "member1@example.com",
  "password": "supersecret123"
}
```

`POST /v1/tenant/auth/signup`

```json
{
  "tenant_id": "tn_001",
  "full_name": "Owner One",
  "email": "admin1@example.com",
  "password": "supersecret123",
  "role": "owner"
}
```

`POST /v1/tenant/auth/signin`

```json
{
  "tenant_id": "tn_001",
  "email": "admin1@example.com",
  "password": "supersecret123",
  "role": "owner"
}
```
