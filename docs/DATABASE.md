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

## Migrasi

Gunakan migrations bernomor dalam `supabase/migrations/`. Jangan mengubah migrasi yang sudah dipakai deployment; buat migrasi baru.
