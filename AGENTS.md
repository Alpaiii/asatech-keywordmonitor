# Coding Agent Instructions — KeywordScope

You are implementing **KeywordScope**, a multi-tenant SEO keyword research and monitoring web app.

## Read first

1. `docs/PROJECT.md`
2. `docs/PRD.md`
3. `docs/ARCHITECTURE.md`
4. `docs/DATABASE.md`
5. `docs/API.md`
6. `docs/ROADMAP.md`

## Engineering rules

- Prefer Next.js App Router + TypeScript + Tailwind CSS + Supabase per PRD.
- Work in small testable increments, following `docs/ROADMAP.md`.
- Before coding, inspect current repository and avoid overwriting working files.
- No hard-coded fake SEO metrics presented as live data. Label demo data explicitly.
- Distinguish Google Ads ad competition from organic keyword difficulty.
- GSC average position is not live SERP ranking. GA4 is not complete organic keyword data.
- Protect tokens server-side; never commit secrets. Enforce workspace authorization and RLS.
- Keep adapters mockable; API approval is an external dependency.
- Document decisions and deviations from PRD.
- Run lint, typecheck, and tests whenever changes affect them.

## Implementation workflow

Read scope → propose affected files → implement → test → summarize changes and limitations → update roadmap checkboxes only when complete.
