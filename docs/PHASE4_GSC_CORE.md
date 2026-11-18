# Phase 4 — Search Console Core

## Konfigurasi server

Tambahkan nilai berikut ke environment server. Jangan memakai prefix `NEXT_PUBLIC_`.

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `OAUTH_TOKEN_ENCRYPTION_KEY` minimal 32 karakter acak
- `APP_BASE_URL`, contoh `http://127.0.0.1:3000`
- `CRON_SECRET` minimal 32 karakter acak

Google OAuth redirect URI:

```text
{APP_BASE_URL}/api/v1/integrations/google/callback
```

Scope GSC:

```text
https://www.googleapis.com/auth/webmasters.readonly
```

## Alur

1. Owner membuka `GET /api/v1/integrations/google/start?provider=gsc&workspaceId=:workspaceId`.
2. Callback memvalidasi state dan PKCE, lalu menyimpan refresh token terenkripsi.
3. Owner memuat properti lewat `GET /api/v1/integrations/google/properties?provider=gsc&workspaceId=:workspaceId`.
4. Owner mengikat properti lewat `POST /api/v1/projects/:projectId/properties`.
5. Binding membuat initial backfill 90 hari dengan lag finalisasi tiga hari.
6. Scheduler memanggil `POST /api/v1/sync/gsc` memakai `Authorization: Bearer {CRON_SECRET}`.

## Semantik data

- Property totals disimpan di `gsc_daily_property_metrics`, tidak dihitung dari query rows.
- Query dan page rows terpisah di `gsc_query_daily` dan `gsc_page_daily`.
- Target match memakai canonical exact match dan disimpan di `gsc_target_keyword_snapshots`.
- `position` selalu dilabeli **GSC average position**. Nilai bukan live SERP rank.
- GSC dapat menyembunyikan query anonim dan membatasi jumlah row; tabel query tidak diklaim exhaustive.
- Sync memakai upsert grain penuh dan retry eksponensial hanya untuk 429/5xx.

## Scheduler contoh

```bash
curl -X POST "$APP_BASE_URL/api/v1/sync/gsc" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Validasi

Rekonsiliasi terhadap GSC UI tetap memerlukan kredensial Google dan properti nyata. Toleransi harus memperhitungkan timezone, data finalization, anonymized queries, dan row limits.
