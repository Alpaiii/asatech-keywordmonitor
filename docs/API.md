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

## API docs eksternal

- GSC: https://developers.google.com/webmaster-tools/v1/api_reference_index
- GA4: https://developers.google.com/analytics/devguides/reporting/data/v1
- Google Ads: https://developers.google.com/google-ads/api/docs/keyword-planning/overview
