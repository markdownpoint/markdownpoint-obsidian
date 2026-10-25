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

export const tr: Translations = {
    name: 'MarkdownPoint',
    outline: 'Anahat',
    sidebar: 'Kenar çubuğu',
    left: 'Sol',
    right: 'Sağ',
    emptySlide: 'Başlıksız slayt',
    fields: {
        text: 'Metin',
        numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
        names: {
            title: 'Başlık',
            body: 'Gövde',
            eyebrow: 'Üst başlık',
            heading: 'Ara başlık',
            subtitle: 'Alt başlık',
            caption: 'Resim yazısı',
            quote: 'Alıntı',
            attribution: 'Kaynak',
            code: 'Kod',
            label: 'Etiket',
            footer: 'Altbilgi',
            number: 'Sayı'
        }
    },
    images: {
        show: 'Slayt görsellerini göster',
        description: 'Editörde her slaytın küçük resminin altında en fazla beş görsel göster.',
        preview: 'Slayt görseli'
    },
    notes: { label: 'Sunucu notları', placeholder: 'Notlar' },
    clipboard: { copyText: 'Kopyala', copyFailed: 'Metin kopyalanamadı.' },
    presentations: {
        new: 'Yeni sunu',
        name: 'Ad',
        folder: 'Klasör',
        theme: 'Tema',
        included: 'Yerleşik',
        root: 'Kasa klasörü',
        untitled: 'Adsız sunu',
        create: 'Oluştur',
        creating: 'Oluşturuluyor…',
        cancel: 'İptal',
        invalidName: 'Eğik çizgi veya ayrılmış karakter içermeyen bir ad girin.',
        exists: 'Bu adda bir dosya veya klasör zaten var.',
        failed: 'Sunu oluşturulamadı. Klasörü kontrol edip tekrar deneyin.',
        openFailed: 'Sunu oluşturuldu ama açılamadı. Klasöründeki slides.md dosyasını açın.',
        openChanged: 'Sunu değişti veya okunamadı. Tekrar deneyin.',
        handoffFailed: 'Sunu kaydedilip açılamadı.',
        themeChanged: 'Tema değişti veya kullanılamıyor. Bu iletişim kutusunu yeniden açıp temayı tekrar seçin.'
    },
    slides: {
        new: 'Yeni slayt',
        shortcut: 'Kısayol',
        noShortcut: 'Yok',
        shortcutHint: 'Bir yerleşimi kullanmak için numarasına basın. Kısayol atamak için yerleşime sağ tıklayın.',
        shortcutFailed: 'Kısayol kaydedilemedi.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}, kısayol ${digit}` : name),
        layoutsUnavailable: 'Bu sunuda kullanılabilir yerleşim yok.',
        layoutChanged: 'Yerleşim değişti. Tekrar seçin.',
        newFailed: 'Slayt eklenmeden önce sunu değişti. Tekrar deneyin.',
        actions: 'Slayt eylemleri',
        copy: ({ count }: { count: number }) => (count === 1 ? 'Slaytı kopyala' : 'Slaytları kopyala'),
        cut: ({ count }: { count: number }) => (count === 1 ? 'Slaytı kes' : 'Slaytları kes'),
        cutChanged: 'Slaytlar kesilmeden önce sunu değişti. Yalnızca kopyalandılar.',
        cutFailed: 'Slaytlar kesilemedi. Yalnızca kopyalandılar.',
        paste: 'Slaytları yapıştır',
        pasteEmpty: 'Önce Obsidian’da bir slayt kopyalayın.',
        pasteDestination: 'Bu sununun teması bu slaytlarla eşleşmiyor. Slaytları MarkdownPoint uygulamasında kopyalayıp yapıştırın.',
        pasteVault: 'Bu slaytlar başka bir kasaya ait. Slaytları MarkdownPoint uygulamasında kopyalayıp yapıştırın.',
        pasteArtwork: 'Bu sunuların tema görselleri farklı. Slaytları MarkdownPoint uygulamasında kopyalayıp yapıştırın.',
        pasteChanged: 'Slaytlar yapıştırılmadan önce sunu değişti. Tekrar deneyin.',
        pasteFailed: 'Slaytlar yapıştırılamadı.',
        copyFailed: 'Slaytlar kopyalanamadı.',
        copyUnavailable: 'Sunu veya tema dosyaları okunamadı.',
        copyChanged: 'Slaytlar kopyalanmadan önce sunu değişti. Tekrar deneyin.',
        delete: ({ count }: { count: number }) => (count === 1 ? 'Slaytı sil' : 'Slaytları sil'),
        deleteFailed: 'Slaytlar silinemedi.',
        recoveryUnavailable: 'Bu cihazdaki kurtarma kopyaları okunamadı.',
        saveFailed: 'Sunu verileri kaydedilemedi. Bu cihazda bir kurtarma kopyası saklanıyor.',
        retry: 'Yeniden dene',
        empty: 'Slayt yok'
    },
    commands: {
        newPresentation: 'Yeni sunu',
        openInMarkdownPoint: 'MarkdownPoint uygulamasında aç',
        newSlide: 'Yeni slayt',
        focusOutline: 'Anahata odaklan',
        focusEditor: 'Editöre odaklan',
        moveSlidesUp: 'Slaytları yukarı taşı',
        moveSlidesDown: 'Slaytları aşağı taşı'
    }
};
