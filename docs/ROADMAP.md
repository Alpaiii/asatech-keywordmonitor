# Roadmap & Task Checklist

> Urutan relatif; estimasi waktu harus diputuskan berdasar kapasitas tim dan approval API.

## Phase 0 — Setup

- [ ] Bootstrap Next.js, TypeScript, Tailwind, shadcn/ui
- [x] Configure linting, formatting, typecheck, tests
- [x] Setup Supabase project dan migrasi awal
- [x] Create `.env.local` berdasarkan `.env.example`

## Phase 1 — Foundation

- [ ] Auth (login/logout/session) dan protected routes
- [ ] Workspaces + membership + RLS tests
- [ ] Projects CRUD + domain validation
- [ ] Dashboard shell, responsive navigation, states

## Phase 2 — Search Console MVP

- [ ] Google OAuth consent read-only + callback validation
- [ ] Select accessible GSC property
- [ ] Store server-side connection securely
- [ ] Pull query/page performance; handle date range & API limits
- [ ] Idempotent daily storage + sync status
- [ ] KPI dashboard / queries table / pages table / charts
- [ ] Test token revoke, 403, 429, timezone, missing data

## Phase 3 — Keyword Research MVP

- [ ] Implement keyword provider interface
- [ ] Keyword input + country/language selectors
- [ ] Integrate approved provider when credentials available
- [ ] Show explicit `not_configured` and unavailable states
- [ ] Save keywords and filter/export results (within scope)

## Phase 4 — GA4 & Insight

- [ ] Connect GA4 with permitted scopes
- [ ] Organic traffic summary, sessions, engagement and key events
- [ ] Rule-based SEO opportunity cards with traceable inputs

## Phase 5 — Release

- [ ] Unit, integration and e2e tests
- [ ] Authorization / RLS penetration scenarios
- [ ] Accessible responsive UI and performance budget
- [ ] Observability, error alerts, privacy policy and deletion flow
- [ ] Deploy preview → staging → production

## MVP done when

- Authorized user can connect GSC and view non-fabricated metrics.
- Another workspace cannot read their data.
- All charts show source and last-sync information.
- Failures and absent provider access have honest UI states.
- Core flow passes automated tests and manual QA.
