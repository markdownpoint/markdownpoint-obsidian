/*
 * MarkdownPoint - Plugin for Obsidian
 * Copyright (c) 2026 Johan Sanneblad
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import type { Translations } from '../index.ts';

export const id: Translations = {
    name: 'MarkdownPoint',
    outline: 'Kerangka',
    sidebar: 'Bilah samping',
    sidebarDescription:
        'Tampilkan kerangka di bilah samping kiri atau kanan. Jika menggunakan Notebook Navigator, biarkan kerangka di kanan.',
    left: 'Kiri',
    right: 'Kanan',
    emptySlide: 'Slide tanpa judul',
    fields: {
        text: 'Teks',
        numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
        names: {
            title: 'Judul',
            body: 'Isi',
            eyebrow: 'Judul kecil',
            heading: 'Tajuk',
            subtitle: 'Subjudul',
            caption: 'Keterangan',
            quote: 'Kutipan',
            attribution: 'Atribusi',
            code: 'Kode',
            label: 'Label',
            footer: 'Footer',
            number: 'Angka'
        }
    },
    images: {
        show: 'Tampilkan gambar',
        description: 'Tampilkan hingga lima gambar di bawah thumbnail setiap slide di pengubah.',
        preview: 'Gambar slide'
    },
    notes: { label: 'Catatan penyaji', placeholder: 'Catatan' },
    clipboard: { copyText: 'Salin', copyFailed: 'Tidak dapat menyalin teks.' },
    presentations: {
        new: 'Presentasi baru',
        name: 'Nama',
        folder: 'Folder',
        theme: 'Tema',
        included: 'Bawaan',
        root: 'Folder vault',
        untitled: 'Presentasi tanpa judul',
        create: 'Buat',
        creating: 'Membuat…',
        cancel: 'Batal',
        invalidName: 'Masukkan nama tanpa garis miring atau karakter yang tidak diizinkan.',
        exists: 'Berkas atau folder dengan nama ini sudah ada.',
        failed: 'Tidak dapat membuat presentasi. Periksa folder dan coba lagi.',
        openFailed: 'Presentasi telah dibuat, tetapi tidak dapat dibuka. Buka slides.md di foldernya.',
        openChanged: 'Presentasi berubah atau tidak dapat dibaca. Coba lagi.',
        handoffFailed: 'Tidak dapat menyimpan dan membuka presentasi.',
        themeChanged: 'Tema berubah atau tidak tersedia. Buka kembali dialog ini dan pilih lagi.',
        newerFormat: ({ version }: { version: string }) =>
            `Presentasi ini menggunakan format MarkdownPoint yang lebih baru (${version}). Perbarui plugin MarkdownPoint untuk membukanya sebagai presentasi.`
    },
    slides: {
        new: 'Slide baru',
        shortcut: 'Pintasan',
        noShortcut: 'Tidak ada',
        shortcutHint: 'Tekan nomor tata letak untuk menggunakannya. Klik kanan tata letak untuk menetapkan pintasan.',
        shortcutFailed: 'Tidak dapat menyimpan pintasan.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}, pintasan ${digit}` : name),
        layoutsUnavailable: 'Tidak ada tata letak yang tersedia di presentasi ini.',
        layoutChanged: 'Tata letak berubah. Pilih lagi.',
        newFailed: 'Presentasi berubah sebelum slide dapat ditambahkan. Coba lagi.',
        actions: 'Tindakan slide',
        copy: () => 'Salin slide',
        cut: () => 'Potong slide',
        cutChanged: 'Presentasi berubah sebelum slide dapat dipotong. Slide hanya disalin.',
        cutFailed: 'Tidak dapat memotong slide. Slide hanya disalin.',
        paste: 'Tempel slide',
        pasteEmpty: 'Salin slide di Obsidian terlebih dahulu.',
        pasteDestination: 'Tema presentasi ini tidak cocok dengan slide tersebut. Salin dan tempel slide di aplikasi MarkdownPoint.',
        pasteVault: 'Slide ini berasal dari vault lain. Salin dan tempel slide di aplikasi MarkdownPoint.',
        pasteArtwork: 'Grafis tema kedua presentasi ini berbeda. Salin dan tempel slide di aplikasi MarkdownPoint.',
        pasteChanged: 'Presentasi berubah sebelum slide dapat ditempelkan. Coba lagi.',
        pasteFailed: 'Tidak dapat menempelkan slide.',
        copyFailed: 'Tidak dapat menyalin slide.',
        copyUnavailable: 'Tidak dapat membaca presentasi atau berkas temanya.',
        copyChanged: 'Presentasi berubah sebelum slide dapat disalin. Coba lagi.',
        copyNewer:
            'Presentasi ini menggunakan format MarkdownPoint yang lebih baru. Perbarui plugin MarkdownPoint untuk menyalin atau memotong slide di dalamnya.',
        delete: () => 'Hapus slide',
        deleteFailed: 'Tidak dapat menghapus slide.',
        recoveryUnavailable: 'Tidak dapat membaca salinan pemulihan di perangkat ini.',
        saveFailed: 'Tidak dapat menyimpan data presentasi. Salinan pemulihan disimpan di perangkat ini.',
        retry: 'Coba lagi',
        empty: 'Tidak ada slide'
    },
    commands: {
        newPresentation: 'Presentasi baru',
        openInMarkdownPoint: 'Buka di MarkdownPoint',
        newSlide: 'Slide baru',
        focusOutline: 'Fokus ke kerangka',
        focusEditor: 'Fokus ke pengubah',
        moveSlidesUp: 'Pindahkan slide ke atas',
        moveSlidesDown: 'Pindahkan slide ke bawah'
    },
    whatsNew: {
        title: 'Yang baru di MarkdownPoint',
        version: ({ version }: { version: string }) => `Versi ${version}`,
        new: 'Baru',
        improved: 'Ditingkatkan',
        changed: 'Diubah',
        fixed: 'Diperbaiki',
        close: 'Tutup',
        section: 'Catatan rilis',
        setting: ({ version }: { version: string }) => `Yang baru di MarkdownPoint ${version}`,
        settingDescription: 'Lihat apa yang berubah pada rilis terbaru.',
        view: 'Lihat pembaruan terbaru',
        showOnUpdate: 'Tampilkan catatan rilis setelah pembaruan',
        showOnUpdateDescription: 'Buka dialog “Yang baru” satu kali setelah setiap pembaruan.'
    }
};
