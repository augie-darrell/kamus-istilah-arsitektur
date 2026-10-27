# Makna tambahan dari KBBI III

Rujukan pustaka: **Pusat Bahasa, Departemen Pendidikan Nasional. (2001). *Kamus besar bahasa Indonesia* (Edisi ke-3). Balai Pustaka.** Metadata audit juga menyimpan ISBN 979-407-182-X. Data digital berasal dari berkas bersih pengguna melalui KBBI Offline 1.5.1 (Ebta Setiawan / ebsoft). Riwayat perangkat lunak terpisah dari atribusi buku pada pembaca.

## Cakupan dan prioritas

Pada impor awal, 617 dari 923 entri Indonesia tanpa penjelasan sumber mendapat cuplikan: 468 kecocokan lema dan 149 sublema. Ada 82 entri dengan lebih dari satu homonim dan 22 pengalihan eksplisit. Sebanyak 306 entri dilewati karena tidak cocok persis, berupa singkatan kapital, atau batas cuplikannya tidak pasti. Tidak ada pencocokan kabur atau makna buatan.

Makna blog selalu diutamakan. **Makna dari KBBI III** hanya tampil untuk entri Indonesia tanpa penjelasan blog dan dengan lema yang masih cocok. **KBBI VI** pada Baca lebih lanjut membuka situs resmi terkini; tautan itu bukan sumber cuplikan luring ini atau API definisi.

## Penyimpanan dan tampilan

`data/dictionary.json` menyimpan `supplemental_meanings.kbbi_iii` terpisah dari `definition` dan `source_text`. Cuplikan mencatat ID, nomor rekaman, batas karakter, homonim, serta pengalihan. `data/kbbi-iii-sources.json` menyimpan 670 rekaman sumber terpakai dengan string asli; `data/kbbi-iii-import-report.json` mencatat kecocokan, entri yang dilewati, dan hash masukan. Berkas audit tidak dimuat oleh pembaca.

`data/reader.js` hanya membawa informasi tampilan/pencarian yang diperlukan. Editor memuat arsip lengkap dan mempertahankannya saat ekspor. Definisi baru dari penyunting tetap diutamakan. Perubahan lema/bahasa tidak boleh membuat cuplikan lama tampil pada makna lain.

`assets/js/kbbi-format.js` memisahkan makna bernomor, pelafalan, kelas kata, label, dan contoh. Pada tampilan/pencarian, singkatan umum seperti yg, pd, dng, dan sbg diperluas. Contoh disembunyikan; titik koma di tengah makna dipertahankan, hanya tanda baca akhir dirapikan. Satu lema tidak mengulang judul. Beberapa lema memakai judul serif lebih kecil. Semua kelas kata tampil sekali pada ringkasan atas dan singkatannya pada daftar; filter dan grafik memakai kelas yang sama.

Sebanyak 49 label bidang/ragam dari 166 entri menjadi tag grafik di bawah **Umum**, hanya dari cuplikan yang dipakai. Label tidak ditampilkan sebagai kode atau bagian tambahan di kolom tengah. Kiasan merupakan ragam penggunaan. Teks, singkatan, contoh, dan tanda baca asli tetap tersimpan untuk audit.

## Mengulang impor

Jalankan dari folder situs:

```powershell
node tools/import-kbbi-iii.cjs "C:/lokasi/kbbi-iii-clean"
node tools/check-all.cjs
```

Folder harus memuat `kbbi_clean.json` bermetadata edisi III. Impor memperbarui master, rekaman terpakai, laporan, asosiasi, serta bundel pembaca melalui generator yang sama dengan editor. Tidak perlu akun, API, atau internet. Masukan pengguna tidak diubah.

KBBI III tidak menggantikan pemeriksaan edisi terkini. Hak data tetap mengikuti sumber dan tidak termasuk lisensi MIT kode situs; lihat LICENSE_SCOPE.md.
