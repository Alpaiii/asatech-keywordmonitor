# Project Context — KeywordScope

## Ringkasan

KeywordScope adalah SaaS dashboard multi-workspace untuk (1) riset keyword Google dan (2) monitoring performa SEO website milik pengguna. Target awal: pemilik website, pengembang, freelancer SEO, agensi kecil, dan UMKM Indonesia. Bahasa awal: Indonesia.

## Problem

Pengguna perlu berpindah antara tool riset keyword, GSC, dan GA4; indikator kerap tertukar (volume iklan vs ranking organik); laporan manual sulit distandardisasi.

## Sasaran MVP

1. Autentikasi dan isolasi workspace.
2. Menambahkan proyek website.
3. Menghubungkan dan memilih properti GSC yang memiliki izin.
4. Dashboard query/pages GSC: clicks, impressions, CTR, average position dengan filter tanggal.
5. Menyimpan keyword target; riset keyword menggunakan provider adapter, dengan state `not_configured` bila API belum tersedia.
6. Menunjukkan freshness data, error sinkronisasi, loading/empty/error states.

## Setelah MVP

GA4 organic traffic, ekspor CSV, opportunity scoring, perbandingan periode, competitor SERP tracking, notifikasi, billing.

## Di luar scope MVP

Menjamin ranking #1; mengambil keyword rahasia dari GA4; scraping Google SERP tanpa layanan/izin yang sesuai; menjanjikan volume presisi; membuat AI report sebagai sumber fakta.

## Peran

- Owner: mengelola workspace dan integrasi.
- Member: membaca/meneliti proyek sesuai izin.
- Sistem: menjalankan sinkronisasi terjadwal.

## User flow

Login → buat workspace → buat proyek website → connect Google → pilih properti GSC → initial sync → lihat dashboard/filter → simpan keyword → pantau tren.

## Prinsip kualitas

- Gunakan data asli dari provider atau label simulasi yang jelas.
- Tampilkan tanggal terakhir diperbarui, sumber, negara, bahasa, dan device bila relevan.
- Jangan tampilkan refresh token atau secret di browser/log.
- Tidak ada akses lintas-workspace.
- Hindari hard-coded angka KPI untuk production.

## Referensi mendetail

Lihat [PRD.md](PRD.md) sebagai sumber kebenaran requirements. Jika ada konflik, tandai keputusan sebelum mengubah scope.
