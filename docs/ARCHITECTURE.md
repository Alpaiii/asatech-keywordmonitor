# Technical Architecture

## Topologi

```
Browser (Next.js UI)
    │ HTTPS / authenticated session
    ▼
Next.js Route Handlers / Server Actions
    ├── Supabase Auth + PostgreSQL (RLS)
    ├── Google OAuth (server-side token handling)
    ├── Search Console API adapter
    ├── GA4 Data API adapter (phase 2)
    └── Keyword data provider adapter (optional / gated)

Protected scheduler → sync worker → API adapters → PostgreSQL
```

## Batas layanan

- **Web UI**: presentasi, filters, interaction, no provider secrets.
- **Domain**: workspaces, projects, keywords, search performance, reporting.
- **Integrations**: Google connection management, refresh tokens encrypted server-side, consent/scopes.
- **Sync**: idempotent upsert by project/date/query/device/country; retry 429/5xx, halt on revoked permissions.
- **Data access**: enforce authenticated permissions on server plus RLS.

## Folder implementasi (usulan, belum dibuat)

```
src/
  app/(auth)/login/
  app/(dashboard)/dashboard/
  app/(dashboard)/projects/[projectId]/
  app/(dashboard)/research/
  app/api/v1/
  components/ui/
  components/dashboard/
  features/auth/
  features/projects/
  features/research/
  features/gsc/
  features/ga4/
  lib/db/
  lib/auth/
  lib/integrations/
  lib/validation/
  server/jobs/
supabase/migrations/
tests/
```

## Provider contract (sketsa)

```ts
export interface KeywordProvider {
  search(input: { query: string; country: string; language: string }): Promise<{
    status: "ready" | "not_configured" | "error";
    provider: string;
    keywords: Array<{
      keyword: string;
      monthlySearches: number | null;
      adCompetition: string | null;
    }>;
  }>;
}
```

## Keputusan utama

- Google OAuth untuk GSC/GA4 dipisahkan dari login aplikasi.
- Google Search Console average position tidak dipasarkan sebagai ranking real-time.
- Data Ads `competition` adalah kompetisi iklan, bukan organic keyword difficulty.
- Provider yang belum mendapat izin tidak boleh diam-diam diganti dengan angka palsu.
- Pencatatan sync status dan sumber data wajib.
