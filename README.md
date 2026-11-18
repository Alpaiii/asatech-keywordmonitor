# KeywordScope

Web dashboard untuk **keyword research** dan **SEO monitoring**, dengan data resmi dari Google Search Console (GSC), Google Analytics 4 (GA4), dan sumber keyword planning yang tersedia.

> Status: dokumentasi perencanaan. Tidak ada klaim fitur/API telah diimplementasikan.

## Stack usulan

- Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Supabase Auth + PostgreSQL, Row Level Security (RLS)
- Google OAuth 2.0, Search Console API, GA4 Data API
- Provider adapter untuk Google Ads keyword planning / SERP provider
- Recharts; Vercel; protected scheduled jobs

## Mulai membaca

1. [`docs/PROJECT.md`](docs/PROJECT.md) — scope, alur, dan aturan data
2. [`docs/PRD.md`](docs/PRD.md) — persyaratan produk lengkap
3. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — sistem dan struktur kode
4. [`docs/DATABASE.md`](docs/DATABASE.md) — rancangan penyimpanan
5. [`docs/API.md`](docs/API.md) — kontrak endpoint
6. [`docs/PHASE0_PRODUCT_CONTRACT.md`](docs/PHASE0_PRODUCT_CONTRACT.md) — kontrak fitur gabungan, akses, sumber posisi, dan gate
7. [`docs/ROADMAP.md`](docs/ROADMAP.md) — tahapan kerja
8. [`AGENTS.md`](AGENTS.md) — aturan coding agent

## Catatan data

- GSC = query, clicks, impressions, CTR, average position untuk properti yang diotorisasi.
- GA4 = sessions, users, engagement, key events. Bukan sumber daftar lengkap keyword organik.
- Google Ads = volume dan kompetisi **iklan**; tidak otomatis merupakan kesulitan ranking organik; akses API planning memerlukan persetujuan.
- Angka dari mock/demo harus diberi label simulasi, bukan data nyata.
