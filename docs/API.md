# Internal API Contract (draft)

Base path: `/api/v1`. Seluruh contoh ini adalah kontrak rancangan, bukan endpoint yang sudah aktif.

| Method | Path                                      | Tujuan                         |
| ------ | ----------------------------------------- | ------------------------------ |
| GET    | `/workspaces`                             | Daftar workspace               |
| POST   | `/workspaces`                             | Buat workspace                 |
| GET    | `/projects`                               | Daftar proyek sesuai workspace |
| POST   | `/projects`                               | Buat proyek                    |
| GET    | `/projects/:id`                           | Detail proyek                  |
| GET    | `/integrations/google/start?provider=gsc` | Mulai consent OAuth            |
| GET    | `/integrations/google/callback`           | Callback OAuth, validasi state |
| GET    | `/integrations/google/properties?provider=gsc&workspaceId=:id` | Properti GSC berizin |
| POST   | `/integrations/google/disconnect`         | Revoke dan disconnect provider |
| POST   | `/projects/:id/properties`                | Bind properti ke project       |
| POST   | `/sync/gsc`                               | Daily sync via scheduler secret |
| GET    | `/projects/:id/gsc/overview`              | KPI berdasarkan periode        |
| GET    | `/projects/:id/gsc/queries`               | Query GSC + pagination         |
| GET    | `/projects/:id/gsc/pages`                 | Halaman GSC                    |
| GET    | `/projects/:id/keywords`                  | Keyword target                 |
| POST   | `/projects/:id/keywords`                  | Tambah keyword                 |
| POST   | `/research/keywords`                      | Pencarian keyword via adapter  |
| GET    | `/projects/:id/sync-jobs`                 | Status sinkronisasi            |

## Response conventions

Sukses memakai field `data` dan, bila perlu, `meta`. Semua error memakai:

```json
{
  "error": {
    "code": "PROVIDER_NOT_CONFIGURED",
    "message": "Keyword provider belum tersedia",
    "requestId": "example-request-id"
  }
}
```

`requestId` di atas adalah contoh, bukan nilai live.

## Query filters

Gunakan `startDate`, `endDate`, `country`, `device`, `searchType`, `page`, dan cursor bila diperlukan. Validate dengan Zod sebelum DB/provider call.

## Autentikasi & proteksi

- Session pengguna wajib, kecuali callback OAuth yang divalidasi secara aman.
- Cek membership workspace dan hak proyek pada setiap endpoint.
- OAuth `state` + PKCE jika berlaku, refresh token hanya di backend.
- Rate-limit research endpoints; job trigger hanya lewat kredensial scheduler.
- Gunakan 400 untuk invalid input, 401 unauthenticated, 403 forbidden, 429 rate limit, 502/503 upstream errors.

## Endpoint gabungan yang direncanakan

| Method | Path | Tujuan |
| --- | --- | --- |
| GET/POST | `/projects/:id/keyword-targets` | List/create target keyword |
| GET/PATCH/DELETE | `/keyword-targets/:id` | Detail/update/delete target |
| GET/POST | `/keyword-targets/:id/checkins` | Riwayat/tambah check-in posisi |
| POST | `/checkins/:id/evidence` | Upload metadata bukti privat |
| GET | `/keyword-targets/:id/trend` | Tren posisi berlabel sumber |
| GET | `/projects/:id/audit` | Audit operasional traceable |
| GET | `/imports/keyword-targets/template` | Unduh template Excel target keyword (aktif) |
| POST | `/imports/keyword-targets` | Preview/import target keyword (aktif) |
| GET | `/imports/rank-checkins/template` | Unduh template check-in ranking (aktif) |
| POST | `/imports/rank-checkins` | Preview/import check-in manual (aktif) |
| GET | `/imports/:id` | Status dan hasil per baris (aktif) |
| GET/POST | `/projects/:id/article-qc` | Riwayat/jalankan Article QC |
| GET | `/article-qc/:id` | Detail run dan findings |

Resource privat dari workspace lain dikembalikan sebagai `404` agar keberadaannya tidak bocor. Operasi yang diketahui tetapi tidak diizinkan role memakai `403`. Kontrak rinci ada di [PHASE0_PRODUCT_CONTRACT.md](PHASE0_PRODUCT_CONTRACT.md).

## API docs eksternal

- GSC: https://developers.google.com/webmaster-tools/v1/api_reference_index
- GA4: https://developers.google.com/analytics/devguides/reporting/data/v1
- Google Ads: https://developers.google.com/google-ads/api/docs/keyword-planning/overview
