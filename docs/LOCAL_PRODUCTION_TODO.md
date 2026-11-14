# Todo — Production Lokal dengan Database Lokal

Target: menjalankan build production KeywordScope di komputer lokal dengan Next.js dan Supabase lokal. Integrasi Google dan provider keyword belum menjadi syarat tahap ini.

## Batas scope

### Termasuk

- Next.js production build di `http://localhost:3000`.
- Supabase lokal melalui Supabase CLI dan Docker Desktop.
- Auth lokal, workspace, membership, project CRUD, dan RLS.
- Dashboard shell dan status integrasi yang jujur.
- Migrasi database, seed development, test, dan dokumentasi operasi lokal.

### Ditunda

- Deployment Vercel atau server publik.
- Supabase Cloud.
- Google Search Console OAuth dan sinkronisasi data nyata.
- GA4.
- Google Ads atau provider keyword berbayar.
- SERP provider, billing, email, dan notifikasi.

## 0. Prasyarat mesin

- [x] Pasang Node.js 22 LTS.
- [ ] Aktifkan Corepack dan pasang `pnpm`. (`pnpm` terpasang global; Corepack lokal gagal menjalankan binary.)
- [x] Pasang Git.
- [x] Pasang Docker Desktop.
- [x] Pasang Supabase CLI sebagai development dependency proyek.
- [x] Pastikan virtualisasi dan Docker berjalan.
- [ ] Verifikasi versi alat:

```bash
node --version
pnpm --version
git --version
docker --version
supabase --version
```

**Selesai bila:** semua perintah berhasil dan Docker dapat menjalankan container.

## 1. Bootstrap repository dan aplikasi

- [x] Inisialisasi repository Git.
- [x] Buat `.gitignore` untuk Next.js, `.env*`, output test, dan file Supabase lokal yang tidak boleh dilacak.
- [x] Bootstrap Next.js App Router dengan TypeScript, Tailwind CSS, ESLint, dan folder `src/`.
- [x] Tetapkan `pnpm` sebagai package manager.
- [x] Tambahkan script `dev`, `build`, `start`, `lint`, `typecheck`, dan `test`.
- [x] Pasang dan konfigurasi Prettier.
- [x] Pasang Vitest dan Testing Library.
- [x] Pasang Playwright untuk E2E lokal.
- [ ] Pasang shadcn/ui hanya untuk komponen yang dibutuhkan.
- [x] Buat halaman health check sederhana.

**Selesai bila:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, dan `pnpm build` berhasil.

## 2. Konfigurasi Supabase lokal

- [x] Jalankan `supabase init`.
- [x] Jalankan `supabase start`.
- [x] Catat URL API lokal, anon key, service-role key, dan URL Mailpit dari output CLI. (Studio dinonaktifkan karena health check lokal timeout.)
- [x] Jangan commit key atau secret lokal.
- [x] Buat `.env.local` dari `.env.example`.
- [ ] Isi konfigurasi lokal:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>
APP_BASE_URL=http://localhost:3000
OAUTH_TOKEN_ENCRYPTION_KEY=<random-secret>
CRON_SECRET=<random-secret>
```

- [x] Biarkan kredensial Google kosong sampai integrasi GSC dikerjakan.
- [x] Validasi environment variables dengan Zod saat server mulai.
- [x] Pastikan service-role key hanya diimpor modul server.

Generate secret lokal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

**Selesai bila:** Supabase Studio terbuka dan aplikasi dapat melakukan koneksi health check ke Supabase lokal.

## 3. Skema database awal

- [ ] Putuskan model awal mengikuti PRD sebagai sumber utama.
- [ ] Buat migrasi bernomor dalam `supabase/migrations/`.
- [ ] Aktifkan extension UUID yang diperlukan.
- [ ] Buat enum role awal: `owner` dan `member`.
- [ ] Buat tabel `profiles`.
- [ ] Buat tabel `workspaces`.
- [ ] Buat tabel `workspace_members`.
- [ ] Buat tabel `projects`.
- [ ] Tambahkan `created_at` dan `updated_at` bertipe `timestamptz`.
- [ ] Tambahkan foreign key, unique constraint, dan index sesuai grain data.
- [ ] Tambahkan trigger pembuatan profile/default workspace setelah user baru bila dipilih sebagai desain final.
- [ ] Buat seed development yang jelas berlabel demo.
- [ ] Jangan masukkan metrik SEO palsu sebagai data live.

**Selesai bila:** `supabase db reset` menerapkan semua migrasi dan seed tanpa error.

## 4. Row Level Security dan otorisasi

- [ ] Aktifkan RLS pada seluruh tabel yang dapat diakses client.
- [ ] Buat policy profile untuk user sendiri.
- [ ] Buat policy workspace berdasarkan membership.
- [ ] Buat policy workspace member berdasarkan membership dan role.
- [ ] Buat policy project berdasarkan workspace membership.
- [ ] Batasi operasi owner-only bila diperlukan.
- [ ] Tambahkan pemeriksaan otorisasi server-side; jangan bergantung pada RLS saja.
- [ ] Buat test bahwa workspace A tidak dapat membaca atau mengubah data workspace B.
- [ ] Buat test unauthenticated access.
- [ ] Buat test role owner/member.

**Selesai bila:** test isolasi tenant dan permission lulus.

## 5. Supabase Auth lokal

- [ ] Buat Supabase client browser.
- [ ] Buat Supabase client server dengan cookie session.
- [ ] Buat middleware/proxy protected routes sesuai versi Next.js yang digunakan.
- [ ] Buat halaman login email/password lokal.
- [ ] Buat logout.
- [ ] Pastikan session refresh bekerja.
- [ ] Pisahkan login aplikasi dari consent Google data.
- [ ] Konfigurasi redirect URL lokal di Supabase config.
- [ ] Tambahkan state loading, invalid credentials, dan expired session.

**Selesai bila:** user dapat daftar/login, membuka route terlindungi, refresh halaman, lalu logout.

## 6. Workspace dan project foundation

- [ ] Buat default workspace saat onboarding.
- [ ] Buat workspace selector minimal.
- [ ] Buat daftar project.
- [ ] Buat form project dengan field nama, URL/domain, negara, bahasa, dan timezone.
- [ ] Validasi input memakai Zod di client dan server; server menjadi sumber kebenaran.
- [ ] Buat project detail.
- [ ] Buat update project.
- [ ] Buat archive/delete project dengan pemeriksaan owner.
- [ ] Pastikan duplicate domain hanya dibatasi sesuai workspace dan keputusan produk.
- [ ] Buat empty, loading, error, forbidden, dan success states.

**Selesai bila:** project CRUD berfungsi dan tidak dapat menembus batas workspace.

## 7. Dashboard shell lokal

- [ ] Buat layout dashboard responsif.
- [ ] Buat sidebar desktop dan drawer mobile.
- [ ] Buat top bar dengan project selector dan user menu.
- [ ] Buat design tokens untuk warna, spacing, radius, shadow, dan status.
- [ ] Tambahkan navigasi Overview, Keyword Explorer, Keyword Lists, SEO Monitoring, Projects, dan Settings.
- [ ] Tampilkan GSC sebagai `Belum terhubung`.
- [ ] Tampilkan GA4 sebagai `Belum tersedia` atau fase lanjutan.
- [ ] Tampilkan keyword provider sebagai `not_configured`.
- [ ] Jangan tampilkan KPI dekoratif atau angka SEO palsu.
- [ ] Tambahkan label data demo pada seed development yang terlihat pengguna.
- [ ] Uji viewport 1440, 1280, 1024, 768, dan 375 px.
- [ ] Uji keyboard focus dan reduced motion dasar.

**Selesai bila:** shell dapat dipakai pada desktop/mobile dan seluruh data belum tersedia memiliki state jujur.

## 8. API internal minimum

- [ ] Gunakan base path `/api/v1` bila route handler dibutuhkan.
- [ ] Buat konvensi sukses `{ data, meta? }`.
- [ ] Buat konvensi error `{ error: { code, message, requestId } }`.
- [ ] Tambahkan request ID.
- [ ] Validasi request memakai Zod.
- [ ] Terapkan status HTTP 400, 401, 403, 404, 409, dan 500 secara konsisten.
- [ ] Pastikan setiap endpoint project memeriksa session dan workspace membership.
- [ ] Jangan buat endpoint scheduler publik pada tahap ini.

**Selesai bila:** contract test endpoint workspace/project minimum lulus.

## 9. Pengujian dan quality gate

- [ ] Unit test validasi URL/domain.
- [ ] Unit test helper authorization.
- [ ] Integration test migrasi dan repository database.
- [ ] RLS test lintas-workspace.
- [ ] E2E: daftar/login → default workspace → buat project → edit project → logout.
- [ ] E2E untuk forbidden dan empty state.
- [ ] Jalankan pemeriksaan aksesibilitas dasar.
- [ ] Pastikan tidak ada secret dalam client bundle atau log.
- [ ] Pastikan tidak ada hard-coded metrik SEO live.

Quality gate:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright test
```

**Selesai bila:** semua perintah berhasil tanpa error.

## 10. Menjalankan production build lokal

- [ ] Pastikan Supabase lokal hidup:

```bash
supabase start
```

- [ ] Reset database bila dibutuhkan:

```bash
supabase db reset
```

- [ ] Build aplikasi:

```bash
pnpm build
```

- [ ] Jalankan Next.js production server:

```bash
pnpm start
```

- [ ] Buka `http://localhost:3000`.
- [ ] Verifikasi login, session, workspace, project CRUD, RLS, dan responsive UI.
- [ ] Verifikasi restart aplikasi tidak menghilangkan data database.
- [ ] Verifikasi pesan error saat Supabase berhenti.

**Selesai bila:** alur utama bekerja lewat production server, bukan `pnpm dev`.

## 11. Operasi dan dokumentasi lokal

- [ ] Dokumentasikan perintah start/stop/status Supabase.
- [ ] Dokumentasikan migrasi dan reset database.
- [ ] Dokumentasikan seed demo dan akun test.
- [ ] Dokumentasikan cara rotasi secret lokal.
- [ ] Dokumentasikan backup/restore database lokal sebelum data dianggap penting.
- [ ] Tambahkan troubleshooting Docker port conflict dan container gagal start.
- [ ] Tambahkan checklist startup harian.
- [ ] Tambahkan checklist shutdown aman.

Perintah dasar:

```bash
supabase status
supabase stop
```

**Selesai bila:** developer baru dapat menjalankan sistem hanya dari README dan dokumentasi repository.

## 12. Gate sebelum integrasi GSC

- [ ] Auth lokal stabil.
- [ ] Workspace/project authorization stabil.
- [ ] RLS isolation test lulus.
- [ ] Production build lokal lulus.
- [ ] Secret tidak bocor ke browser atau repository.
- [ ] Struktur adapter integrations sudah dapat diuji dengan mock tanpa metrik palsu.
- [ ] Keputusan penyimpanan token terenkripsi sudah didokumentasikan.
- [ ] Google Cloud project dan OAuth belum diperlukan sampai gate ini selesai.

## Definition of Done

Production lokal tahap foundation selesai bila:

- [ ] `supabase start` menjalankan seluruh layanan database/auth lokal.
- [ ] `supabase db reset` berhasil dari kondisi bersih.
- [ ] `pnpm build && pnpm start` menjalankan aplikasi di `http://localhost:3000`.
- [ ] User lokal dapat login dan logout.
- [ ] User dapat membuat dan mengelola project dalam workspace sendiri.
- [ ] Workspace lain tidak dapat membaca atau mengubah data tersebut.
- [ ] UI responsif menampilkan status provider yang jujur tanpa metrik fabrikasi.
- [ ] Lint, typecheck, unit/integration test, E2E, dan production build lulus.
- [ ] Tidak ada secret yang terlacak Git atau terkirim ke client.
- [ ] `docs/ROADMAP.md` hanya diperbarui untuk item yang benar-benar selesai.
