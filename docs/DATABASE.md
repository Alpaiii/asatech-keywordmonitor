# Database Design — PostgreSQL / Supabase

## Entitas awal

| Table               | Kolom penting                                                                                          | Fungsi         |
| ------------------- | ------------------------------------------------------------------------------------------------------ | -------------- |
| `profiles`          | `id (auth.users FK)`, `display_name`, `created_at`                                                     | Profil         |
| `workspaces`        | `id`, `name`, `owner_id`                                                                               | Tenant         |
| `workspace_members` | `workspace_id`, `user_id`, `role`                                                                      | Hak akses      |
| `projects`          | `id`, `workspace_id`, `name`, `site_url`, `gsc_property_uri`                                           | Website        |
| `oauth_connections` | `id`, `workspace_id`, `provider`, `encrypted_token_ref`, `scopes`, `status`                            | Koneksi aman   |
| `keywords`          | `id`, `project_id`, `phrase`, `country`, `language`, `device`                                          | Keyword target |
| `keyword_metrics`   | `id`, `keyword_id`, `provider`, `monthly_searches`, `ad_competition`, `captured_at`                    | Metrik riset   |
| `gsc_query_daily`   | `project_id`, `date`, `query`, `page`, `country`, `device`, `clicks`, `impressions`, `ctr`, `position` | Performa GSC   |
| `sync_jobs`         | `id`, `project_id`, `provider`, `status`, `attempt_count`, `last_error`, `started_at`, `finished_at`   | Observabilitas |

Lihat PRD bagian 10 untuk model data yang lebih luas dan tabel fase lanjutan.

## Aturan

- Foreign key dan unique constraints harus mencerminkan identitas sebenarnya.
- `gsc_query_daily` upsert menggunakan unique key gabungan yang sesuai dimensi permintaan, termasuk dimensi opsional yang dinormalisasi secara konsisten.
- Semua query milik workspace harus lolos validasi membership.
- RLS aktif pada semua tabel yang dapat diakses lewat client.
- Provider tokens terenkripsi, tidak diekspos melalui query frontend, API respons, atau log.
- `created_at` / `updated_at` gunakan `timestamptz`; uang / volume disimpan sesuai tipe sumber.
- Retention, deletion, dan data export didefinisikan sebelum go-live.

## Model gabungan yang direncanakan

- Research: `keyword_lists`, `keywords`, `keyword_list_items`, `keyword_metric_snapshots`.
- Operasional: `keyword_targets`, `rank_checkins`, `rank_evidence`, `rank_status_snapshots`, `imports`, `import_rows`.
- Provider: `project_properties`, tabel agregat GSC/GA4, dan `gsc_target_keyword_snapshots`.
- Quality/reporting: `article_qc_runs`, `article_qc_findings`, `opportunities`, `exports`, `audit_events`.
- Fitur website aplikasi lama dipetakan ke `projects`; jangan membuat entitas website duplikat.
- PIC merujuk `workspace_members.user_id`; akses project MVP berlaku workspace-wide.
- Check-in posisi manual bersifat event immutable. GSC average position disimpan terpisah dan tidak menimpa check-in.

## Implementasi Phase 2

Migrasi `202611160002_keyword_operations.sql` menambahkan:

- `keyword_targets` dengan grain unik project + canonical phrase + locale + device + normalized location.
- PIC yang wajib berasal dari `workspace_members` pada workspace sama.
- `rank_checkins` immutable dengan posisi `1..100` atau `not_found_top_100 = true`.
- `rank_evidence` untuk metadata file private maksimal 10 MiB.
- `rank_status_snapshots` immutable dengan `rule_version`, explanation, dan input JSON.
- Private bucket `rank-evidence`; object path diawali UUID workspace.
- RLS workspace-member pada seluruh tabel operasi keyword.

Sumber `gsc_average_position` tidak masuk `rank_checkins`; snapshot GSC tetap memakai tabel provider terpisah pada fase integrasi GSC.

Migrasi hardening `202611180001_keyword_security_hardening.sql` dan `202611180002_keyword_data_integrity.sql` menambahkan:

- Check-in authenticated hanya boleh bersumber `manual` dan konteks country/device/location harus sama dengan target.
- Waktu check-in masa depan ditolak.
- Snapshot status hanya dibuat server-side dan check-in acuannya wajib milik target sama.
- Path metadata evidence wajib cocok dengan workspace, target, check-in, object storage, dan uploader.
- Identity `(workspace_id, user_id)` membership tidak dapat dipindah melalui update.
- Delete target owner-only; target dengan history immutable tetap tidak dapat dihapus permanen.

Grain, invariants, permission matrix, dan security baseline lengkap ada di [PHASE0_PRODUCT_CONTRACT.md](PHASE0_PRODUCT_CONTRACT.md).

## Implementasi Phase 4

Migrasi `202611180004_phase4_gsc_core.sql` menambahkan:

- `oauth_connections` tanpa policy `authenticated`; token hanya diakses server service role.
- `project_properties` untuk binding satu properti GSC aktif per project.
- Property totals, query rows, dan page rows pada tabel terpisah.
- `sync_jobs` idempotent per project, search type, dan periode.
- `gsc_target_keyword_snapshots` untuk canonical exact match tanpa menulis `rank_checkins`.
- RLS read-only anggota workspace pada properti, data GSC, job, dan snapshot target.

## Migrasi

Gunakan migrations bernomor dalam `supabase/migrations/`. Jangan mengubah migrasi yang sudah dipakai deployment; buat migrasi baru.
