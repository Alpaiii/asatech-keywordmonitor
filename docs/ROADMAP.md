# Roadmap & Task Checklist

> Urutan relatif; estimasi waktu harus diputuskan berdasar kapasitas tim dan approval API. Checklist hanya ditandai selesai setelah acceptance gate terbukti.

## Phase 0 — Product & Data Contract

- [x] Tetapkan workspace sebagai tenant boundary dan permission matrix owner/member
- [x] Tetapkan project sebagai representasi website; PIC memakai workspace member
- [x] Bedakan `manual`, `gsc_average_position`, dan `serp_provider`
- [x] Tetapkan status target keyword v1 dan default rule
- [x] Rancang domain model dan API gabungan
- [x] Dokumentasikan security baseline untuk OAuth, evidence, export, import, dan Article QC
- [x] Dokumentasikan phase gate di `docs/PHASE0_PRODUCT_CONTRACT.md`
- [ ] Putuskan retention final dan deletion SLA sebelum deployment publik
- [ ] Putuskan budget/quota provider sebelum provider berbayar aktif

**Gate:** kontrak implementasi tersedia; isu retention publik dan provider berbayar tetap diblokir sampai keputusan final.

## Phase 1 — Foundation SaaS Lokal

### Setup

- [x] Bootstrap Next.js, TypeScript, Tailwind
- [x] Configure linting, formatting, typecheck, tests
- [x] Setup Supabase lokal dan migrasi foundation
- [x] Create `.env.local` berdasarkan `.env.example`
- [x] Tambahkan komponen UI yang dibutuhkan tanpa memasang library berlebih

### Auth & workspace

- [x] Selesaikan login, signup, logout, expired-session, dan protected routes
- [x] Selesaikan default workspace dan workspace selector
- [x] Tambahkan UI anggota workspace minimum
- [x] Terapkan permission owner/member konsisten di server dan UI
- [x] Pastikan owner terakhir tidak dapat dihapus

### Project CRUD

- [x] Buat daftar dan empty state project
- [x] Buat project dengan validasi nama, URL/domain, negara, bahasa, timezone
- [x] Buat detail dan update project
- [x] Buat archive owner-only; permanent delete tetap terpisah
- [x] Tambahkan loading, success, error, forbidden, dan conflict states

### Authorization & quality

- [x] Tambahkan server authorization; jangan bergantung pada RLS saja
- [x] Buat RLS tests lintas-workspace dan role owner/member
- [x] Buat API contract tests workspace/project
- [x] Buat E2E login → workspace → create/read/update/archive project → logout
- [x] Verifikasi anggota workspace sama dapat berbagi data sesuai role
- [x] Verifikasi non-member tidak dapat membaca/mengubah resource lewat ID langsung
- [x] Buat dashboard shell responsif dan provider states yang jujur
- [x] Jalankan lint, typecheck, unit/integration tests, E2E, dan production build

**Gate:** auth lokal stabil; anggota workspace sama berbagi data sesuai role; non-member ditolak oleh server dan RLS; Project CRUD E2E lulus; semua quality commands lulus.

## Phase 2 — Keyword Operations

- [x] Buat schema target keyword, assignment, check-in, evidence, dan status snapshots
- [x] Buat target keyword CRUD dengan locale, device, target, priority, deadline, maintain, frequency, PIC
- [x] Buat check-in posisi manual `1..100` atau tidak ditemukan top 100
- [x] Simpan check-in sebagai riwayat immutable
- [x] Upload evidence ke private storage dan buat signed URL setelah authorization
- [x] Buat history dan trend chart dengan label sumber
- [x] Implement status engine v1 dengan rule version dan explanation
- [x] Tambahkan filter project, PIC, priority, status, dan maintain
- [x] Tambahkan bulk action aman
- [x] Test cross-workspace, validation, history immutability, dan storage authorization

**Gate:** target, assignment, check-in, evidence, history, trend, dan status bekerja end-to-end tanpa menimpa sejarah atau menembus workspace.

## Phase 3 — Audit & Bulk Data

- [x] Buat audit dashboard untuk no-data, stale, overdue, maintain alert, no-PIC, no-evidence, dan target failure
- [x] Buat progress per project dan performa PIC
- [x] Buat template Excel keyword target
- [x] Buat bulk import keyword dengan preview dan row-level errors
- [x] Buat bulk ranking update dengan idempotency
- [x] Simpan lifecycle import dan hasil per baris
- [x] Buat transaction/partial-result behavior yang eksplisit
- [x] Test file invalid, duplicate, double submit, dan cross-workspace import

**Gate:** setiap audit traceable ke input; import/update tidak merusak data dan selalu memberi hasil per baris.

## Phase 4 — Search Console Core

- [ ] Google OAuth read-only dengan state/PKCE dan callback validation
- [ ] Pilih properti GSC yang dapat diakses
- [ ] Simpan token terenkripsi server-side; disconnect/revoke tersedia
- [ ] Initial backfill dan daily sync idempotent
- [ ] Pisahkan property totals dari query/page rows
- [ ] Handle pagination/API limits, 401, 403, 429, 5xx, timezone, dan missing data
- [ ] Buat KPI dashboard, charts, query/page tables, country/device filters
- [ ] Cocokkan target keyword dengan query GSC melalui canonical exact match dan preview
- [ ] Simpan GSC average position terpisah dari manual check-in
- [ ] Tampilkan freshness, source, incomplete-data, dan sync error states

**Gate:** metrik tervalidasi terhadap GSC dalam batas provider; token tidak bocor; posisi GSC tidak disebut live SERP rank.

**Status implementasi lokal:** schema, OAuth/PKCE, property binding, sync, RLS, API, dan UI tersedia. Checklist tetap terbuka sampai rekonsiliasi memakai properti GSC nyata dan E2E OAuth selesai.

## Phase 5 — Keyword Research

- [ ] Implement keyword provider interface dan mockable adapter
- [ ] Buat seed input, country/language, optional URL, dan limit
- [ ] Tampilkan explicit `not_configured`, unavailable, cached, live, dan development mock states
- [ ] Buat keyword lists, normalization, snapshot metrics, notes, CSV import/export
- [ ] Terapkan cache, throttling, quota, dan usage budget
- [ ] Integrasikan provider hanya setelah credentials/access/budget tersedia
- [ ] Bedakan advertising competition dari organic difficulty

**Gate:** tidak ada metrik live palsu; provider failure/unavailable state bekerja; data provenance lengkap.

## Phase 6 — Article Quality Check

- [ ] Buat secure server-side fetcher dengan SSRF protections
- [ ] Buat versioned rule engine dan explainable score
- [ ] Periksa title, meta, canonical, robots, headings, words, phrase usage, images, links, structured data dasar
- [ ] Simpan run, findings, fetch metadata, dan history
- [ ] Buat recheck dan comparison
- [ ] Hubungkan findings ke audit
- [ ] Test private/reserved IP, redirect, timeout, response size, dan malformed HTML

**Gate:** SSRF/security tests lulus; setiap skor dapat dijelaskan oleh findings; tidak ada klaim jaminan ranking.

## Phase 7 — Opportunities & Reports

- [ ] Buat explainable opportunity rules dengan source, threshold, period, uncertainty
- [ ] Tambahkan status workflow, PIC, dan deadline opportunity
- [ ] Buat period comparison dengan zero-baseline handling
- [ ] Buat CSV dan Excel reports
- [ ] Sertakan summary, comparison, keywords, PIC, projects, actions, history, GSC, QC, metadata
- [ ] Gunakan private exports dan signed URL berdurasi pendek
- [ ] Test report authorization, source/freshness metadata, expiry, dan large export

**Gate:** opportunity dan laporan dapat ditelusuri ke data sumber, rule, filter, periode, dan freshness.

## Phase 8 — GA4 & Release Hardening

- [ ] Connect GA4 dengan permitted read-only scopes
- [ ] Tampilkan organic sessions, users, engagement, dan key events secara terpisah dari GSC
- [ ] Tambahkan observability, structured logs, alerts, retry monitoring
- [ ] Jalankan authorization/RLS penetration scenarios
- [ ] Selesaikan accessible responsive UI dan performance budget
- [ ] Selesaikan privacy policy, retention, deletion, backup/restore, dan audit review
- [ ] Deploy preview → staging → production setelah local production stabil

**Gate:** GA4 semantics benar; release, security, privacy, accessibility, performance, dan core E2E checklist lulus.

## Phase 9 — Licensed SERP Provider (Optional)

- [ ] Pilih provider setelah legal, coverage, cost, dan quality review
- [ ] Tetapkan locale/device/time semantics dan quota
- [ ] Simpan SERP snapshots terpisah dari manual dan GSC
- [ ] Tambahkan competitor visibility hanya dengan provenance jelas

**Gate:** legal terms, biaya, quota, dan data quality disetujui; UI selalu menampilkan sumber dan konteks ranking.

## MVP gabungan selesai ketika

- Authorized user dapat login, mengelola project, target keyword, PIC, check-in, evidence, dan audit.
- Anggota workspace sama berbagi data sesuai role; workspace lain tidak dapat membaca atau mengubah data.
- Authorized user dapat connect GSC dan melihat non-fabricated metrics dengan freshness/source.
- Manual rank, GSC average position, dan optional SERP rank tidak tertukar.
- Keyword research tidak menampilkan metrik live bila provider tidak tersedia.
- Import/export, failures, dan absent provider access memiliki state jujur.
- Core authorization, RLS, data quality, dan E2E tests lulus.
