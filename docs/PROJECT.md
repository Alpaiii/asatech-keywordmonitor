# Project Context — KeywordScope

## Ringkasan

KeywordScope adalah SaaS dashboard multi-workspace untuk (1) riset keyword Google dan (2) monitoring performa SEO website milik pengguna. Target awal: pemilik website, pengembang, freelancer SEO, agensi kecil, dan UMKM Indonesia. Bahasa awal: Indonesia.

## Problem

Pengguna perlu berpindah antara tool riset keyword, GSC, dan GA4; indikator kerap tertukar (volume iklan vs ranking organik); laporan manual sulit distandardisasi.

## Sasaran MVP

1. Autentikasi dan isolasi workspace; anggota workspace yang sama berbagi data sesuai role.
2. Menambahkan proyek website dan mengelola target keyword, PIC, priority, deadline, serta check-in posisi manual.
3. Menyimpan riwayat posisi dan bukti tanpa menimpa sejarah; audit operasional menampilkan item yang perlu tindakan.
4. Menghubungkan dan memilih properti GSC yang memiliki izin.
5. Dashboard query/pages GSC: clicks, impressions, CTR, average position dengan filter tanggal.
6. Menyimpan keyword target; riset keyword menggunakan provider adapter, dengan state `not_configured` bila API belum tersedia.
7. Menunjukkan sumber posisi (`manual`, `gsc_average_position`, atau `serp_provider`), freshness data, error sinkronisasi, loading/empty/error states.

## Setelah MVP

GA4 organic traffic, article quality check, opportunity scoring, laporan Excel/PDF, perbandingan periode, competitor SERP tracking berlisensi, notifikasi, billing.

## Di luar scope MVP

Menjamin ranking #1; mengambil keyword rahasia dari GA4; scraping Google SERP tanpa layanan/izin yang sesuai; menjanjikan volume presisi; membuat AI report sebagai sumber fakta.

## Peran

- Owner: mengelola workspace, anggota, integrasi, archive/delete, dan seluruh pekerjaan SEO.
- Member: membaca data workspace dan menjalankan pekerjaan SEO, termasuk project, target keyword, check-in, quality check, dan export; tidak mengelola anggota/integrasi atau menghapus project.
- Sistem: menjalankan sinkronisasi terjadwal.

Workspace adalah batas tenant. Pengguna dalam workspace yang sama dapat melihat data workspace sesuai role; non-member tidak mendapat akses walaupun mengetahui ID resource. PIN bersama tidak digunakan.

## User flow

Login → buat/pilih workspace → buat proyek website → tambah target keyword/PIC → catat posisi dan bukti → audit pekerjaan → connect Google → pilih properti GSC → initial sync → lihat dashboard/filter → riset/simpan keyword → pantau tren dan buat laporan.

## Prinsip kualitas

- Gunakan data asli dari provider atau label simulasi yang jelas.
- Tampilkan tanggal terakhir diperbarui, sumber, negara, bahasa, dan device bila relevan.
- Jangan tampilkan refresh token atau secret di browser/log.
- Tidak ada akses lintas-workspace.
- Hindari hard-coded angka KPI untuk production.

## Referensi mendetail

Lihat [PRD.md](PRD.md) sebagai sumber kebenaran requirements. Kontrak penggabungan fitur dan gate implementasi ada di [PHASE0_PRODUCT_CONTRACT.md](PHASE0_PRODUCT_CONTRACT.md). Jika ada konflik, tandai keputusan sebelum mengubah scope.
