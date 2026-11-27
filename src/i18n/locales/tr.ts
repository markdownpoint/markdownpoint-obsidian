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
    sidebarDescription: 'Anahattın gösterildiği kenar çubuğu. Notebook Navigator kullanıyorsan anahattı sağa yerleştir.',
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
        show: 'Görselleri göster',
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
        exists: 'Bu adda bir dosya veya klasör zaten var. Başka bir ad girin.',
        insidePresentation: ({ presentation }: { presentation: string }) =>
            `MarkdownPoint, “${presentation}” içinde sunu oluşturamaz. “${presentation}” dışında bir klasör seçin.`,
        nested: ({ presentation, outer }: { presentation: string; outer: string }) =>
            `MarkdownPoint, “${presentation}” sunusunu “${outer}” içindeyken açamaz. “${presentation}” klasörünü “${outer}” dışına taşıyın, ardından sunuyu açın.`,
        failed: 'Sunu oluşturulamadı. Tekrar deneyin.',
        openFailed: 'MarkdownPoint sunuyu oluşturdu ama açamadı. Klasöründeki slides.md dosyasını açın.',
        openChanged: 'Sunu, MarkdownPoint onu açamadan değişti. Tekrar deneyin.',
        handoffFailed: 'Sunu kaydedilip açılamadı.',
        themeChanged: 'Seçilen temadan sunu oluşturulamadı. Bu iletişim kutusunu yeniden açıp temayı tekrar seçin.',
        newerFormat: ({ version }: { version: string }) =>
            `Bu sunu, MarkdownPoint biçiminin daha yeni olan ${version} sürümünü kullanıyor. Sunu olarak açmak için MarkdownPoint eklentisini güncelleyin.`,
        unreadableFile: ({ file, presentation }: { file: string; presentation: string }) =>
            `MarkdownPoint, “${presentation}” içindeki “${file}” dosyasını okuyamaz. Neyi düzeltmeniz gerektiğini görmek için sunuyu MarkdownPoint uygulamasında açın.`,
        unreadable: ({ presentation }: { presentation: string }) =>
            `MarkdownPoint, “${presentation}” içindeki sunuyu okuyamaz. Neyi düzeltmeniz gerektiğini görmek için sunuyu MarkdownPoint uygulamasında açın.`
    },
    slides: {
        new: 'Slayt ekle',
        shortcut: 'Kısayol',
        noShortcut: 'Yok',
        shortcutHint: 'Bir yerleşimi seçmek için kısayoluna basın. Kısayol atamak için yerleşime sağ tıklayın.',
        shortcutFailed: 'Kısayol kaydedilemedi.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}, kısayol ${digit}` : name),
        layoutsUnavailable: 'Bu sunuda kullanılabilir yerleşim yok.',
        layoutChanged: 'Yerleşim, MarkdownPoint slaytı ekleyemeden değişti. Tekrar deneyin.',
        newFailed: 'Sunu, MarkdownPoint slaytı ekleyemeden değişti. Tekrar deneyin.',
        actions: 'Slayt eylemleri',
        copy: 'Slaytı kopyala',
        cut: 'Slaytı kes',
        cutChanged: 'Sunu, MarkdownPoint slaytları kesemeden değişti. Slaytlar panoya kopyalandı ve hâlâ sunuda.',
        cutFailed: 'Slaytlar kesilemedi. Panoya kopyalandı ve hâlâ sunuda.',
        paste: 'Slaytı yapıştır',
        pasteEmpty: 'Önce Obsidian’da bir slayt kopyalayın.',
        pasteDestination: 'Bu sununun teması bu slaytlarla eşleşmiyor. Slaytları MarkdownPoint uygulamasında kopyalayıp yapıştırın.',
        pasteVault: 'Bu slaytlar başka bir kasaya ait. Slaytları MarkdownPoint uygulamasında kopyalayıp yapıştırın.',
        pasteArtwork: 'İki sununun temalarında farklı görseller var. Slaytları MarkdownPoint uygulamasında kopyalayıp yapıştırın.',
        pasteChanged: 'Sunu, MarkdownPoint slaytları yapıştıramadan değişti. Tekrar deneyin.',
        pasteFailed: 'Slaytlar yapıştırılamadı.',
        copyFailed: 'Slaytlar kopyalanamadı.',
        copyUnavailable: 'Sunu veya tema dosyaları okunamadı.',
        copyChanged: 'Sunu, MarkdownPoint slaytları kopyalayamadan değişti. Tekrar deneyin.',
        copyNewer:
            'Bu sunu daha yeni bir MarkdownPoint biçimi kullanıyor. Slaytlarını kopyalamak veya kesmek için MarkdownPoint eklentisini güncelleyin.',
        delete: 'Slaytı sil',
        deleteFailed: 'Slaytlar silinemedi.',
        recoveryUnavailable: 'Bu cihazdaki kurtarma kopyaları okunamadı.',
        saveFailed: 'Sunu verileri kaydedilemedi.',
        retry: 'Yeniden dene',
        empty: 'Slayt yok'
    },
    commands: {
        newPresentation: 'Yeni sunu',
        openInMarkdownPoint: 'MarkdownPoint uygulamasında aç',
        newSlide: 'Slayt ekle',
        focusOutline: 'Anahata odaklan',
        focusEditor: 'Editöre odaklan',
        moveSlidesUp: 'Slaytı yukarı taşı',
        moveSlidesDown: 'Slaytı aşağı taşı'
    },
    whatsNew: {
        title: 'MarkdownPoint yenilikleri',
        version: ({ version }: { version: string }) => `Sürüm ${version}`,
        new: 'Yeni',
        improved: 'İyileştirildi',
        changed: 'Değişti',
        fixed: 'Düzeltildi',
        close: 'Kapat',
        section: 'Sürüm notları',
        setting: ({ version }: { version: string }) => `MarkdownPoint ${version} sürümündeki yenilikler`,
        settingDescription: 'Son sürümlerde nelerin değiştiğini gör.',
        view: 'Sürüm notlarını görüntüle',
        showOnUpdate: 'Güncellemeden sonra sürüm notlarını göster'
    }
};
