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

export const ar: Translations = {
    name: 'MarkdownPoint',
    outline: 'المخطط التفصيلي',
    sidebar: 'الشريط الجانبي',
    sidebarDescription: 'الشريط الجانبي الذي يظهر فيه المخطط التفصيلي. عند استخدام Notebook Navigator، ضع المخطط التفصيلي على اليمين.',
    left: 'الأيسر',
    right: 'الأيمن',
    emptySlide: 'شريحة بدون عنوان',
    fields: {
        text: 'النص',
        numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
        names: {
            title: 'العنوان',
            body: 'النص الأساسي',
            eyebrow: 'العنوان التمهيدي',
            heading: 'العنوان الرئيسي',
            subtitle: 'العنوان الفرعي',
            caption: 'التعليق',
            quote: 'الاقتباس',
            attribution: 'القائل',
            code: 'الشيفرة',
            label: 'التسمية',
            footer: 'التذييل',
            number: 'الرقم'
        }
    },
    images: {
        show: 'إظهار الصور',
        description: 'إظهار ما يصل إلى خمس صور أسفل الصورة المصغرة لكل شريحة في المحرر.',
        preview: 'صورة الشريحة'
    },
    notes: { label: 'ملاحظات مقدم العرض', placeholder: 'ملاحظات' },
    clipboard: { copyText: 'نسخ', copyFailed: 'تعذّر نسخ النص.' },
    presentations: {
        new: 'عرض تقديمي جديد',
        name: 'الاسم',
        folder: 'المجلد',
        theme: 'السمة',
        included: 'مضمّنة',
        root: 'مجلد الخزنة',
        untitled: 'عرض تقديمي بدون عنوان',
        create: 'إنشاء',
        creating: 'جارٍ الإنشاء…',
        cancel: 'إلغاء',
        invalidName: 'أدخل اسمًا بلا شرطات مائلة أو أحرف محجوزة.',
        exists: 'يوجد ملف أو مجلد بهذا الاسم بالفعل. أدخل اسمًا آخر.',
        insidePresentation: ({ presentation }: { presentation: string }) =>
            `يتعذّر على MarkdownPoint إنشاء عرض تقديمي داخل «${presentation}». اختر مجلدًا خارج «${presentation}».`,
        nested: ({ presentation, outer }: { presentation: string; outer: string }) =>
            `يتعذّر على MarkdownPoint فتح العرض التقديمي «${presentation}» ما دام موجودًا داخل «${outer}». انقل مجلد «${presentation}» إلى خارج «${outer}»، ثم افتحه.`,
        failed: 'تعذّر إنشاء العرض التقديمي. حاول مرة أخرى.',
        openFailed: 'أنشأ MarkdownPoint العرض التقديمي لكن تعذّر عليه فتحه. افتح slides.md في مجلده.',
        openChanged: 'تغيّر العرض التقديمي قبل أن يتمكن MarkdownPoint من فتحه. حاول مرة أخرى.',
        handoffFailed: 'تعذّر حفظ العرض التقديمي وفتحه.',
        themeChanged: 'تعذّر إنشاء عرض تقديمي من السمة المختارة. أعد فتح هذه النافذة واختر السمة مرة أخرى.',
        newerFormat: ({ version }: { version: string }) =>
            `يستخدم هذا العرض التقديمي إصدارًا أحدث من تنسيق MarkdownPoint، هو الإصدار ${version}. حدّث إضافة MarkdownPoint لفتحه كعرض تقديمي.`,
        unreadableFile: ({ file, presentation }: { file: string; presentation: string }) =>
            `يتعذّر على MarkdownPoint قراءة «${file}» في «${presentation}». افتح العرض التقديمي في تطبيق MarkdownPoint لمعرفة ما يجب إصلاحه.`,
        unreadable: ({ presentation }: { presentation: string }) =>
            `يتعذّر على MarkdownPoint قراءة العرض التقديمي في «${presentation}». افتحه في تطبيق MarkdownPoint لمعرفة ما يجب إصلاحه.`
    },
    slides: {
        new: 'إضافة شريحة',
        shortcut: 'الاختصار',
        noShortcut: 'لا شيء',
        shortcutHint: 'اضغط على اختصار التخطيط لاختياره. انقر بزر الماوس الأيمن على تخطيط لتعيين اختصار له.',
        shortcutFailed: 'تعذّر حفظ الاختصار.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}، الاختصار ${digit}` : name),
        layoutsUnavailable: 'لا تتوفر تخطيطات في هذا العرض التقديمي.',
        layoutChanged: 'تغيّر التخطيط قبل أن يتمكن MarkdownPoint من إضافة الشريحة. حاول مرة أخرى.',
        newFailed: 'تغيّر العرض التقديمي قبل أن يتمكن MarkdownPoint من إضافة الشريحة. حاول مرة أخرى.',
        actions: 'إجراءات الشريحة',
        copy: 'نسخ الشريحة',
        cut: 'قص الشريحة',
        cutChanged: 'تغيّر العرض التقديمي قبل أن يتمكن MarkdownPoint من قص الشرائح. الشرائح في الحافظة وما زالت في العرض التقديمي.',
        cutFailed: 'تعذّر قص الشرائح. الشرائح في الحافظة وما زالت في العرض التقديمي.',
        paste: 'لصق الشريحة',
        pasteEmpty: 'انسخ شريحة في Obsidian أولًا.',
        pasteDestination: 'سمة هذا العرض التقديمي لا تطابق هذه الشرائح. انسخها والصقها في تطبيق MarkdownPoint.',
        pasteVault: 'هذه الشرائح من خزنة أخرى. انسخها والصقها في تطبيق MarkdownPoint.',
        pasteArtwork: 'تختلف رسومات سمتَي العرضين التقديميين. انسخ الشرائح والصقها في تطبيق MarkdownPoint.',
        pasteChanged: 'تغيّر العرض التقديمي قبل أن يتمكن MarkdownPoint من لصق الشرائح. حاول مرة أخرى.',
        pasteFailed: 'تعذّر لصق الشرائح.',
        copyFailed: 'تعذّر نسخ الشرائح.',
        copyUnavailable: 'تعذّرت قراءة العرض التقديمي أو ملفات سمته.',
        copyChanged: 'تغيّر العرض التقديمي قبل أن يتمكن MarkdownPoint من نسخ الشرائح. حاول مرة أخرى.',
        copyNewer: 'يستخدم هذا العرض التقديمي إصدارًا أحدث من تنسيق MarkdownPoint. حدّث إضافة MarkdownPoint لنسخ شرائحه أو قصها.',
        delete: 'حذف الشريحة',
        deleteFailed: 'تعذّر حذف الشرائح.',
        recoveryUnavailable: 'تعذّرت قراءة نُسخ الاسترداد على هذا الجهاز.',
        saveFailed: 'تعذّر حفظ بيانات العرض التقديمي.',
        retry: 'إعادة المحاولة',
        empty: 'لا توجد شرائح'
    },
    commands: {
        newPresentation: 'عرض تقديمي جديد',
        openInMarkdownPoint: 'فتح في MarkdownPoint',
        newSlide: 'إضافة شريحة',
        focusOutline: 'التركيز على المخطط التفصيلي',
        focusEditor: 'التركيز على المحرر',
        moveSlidesUp: 'نقل الشريحة للأعلى',
        moveSlidesDown: 'نقل الشريحة للأسفل'
    },
    whatsNew: {
        title: 'الجديد في MarkdownPoint',
        version: ({ version }: { version: string }) => `الإصدار ${version}`,
        new: 'جديد',
        improved: 'محسّن',
        changed: 'مُغيّر',
        fixed: 'مُصلح',
        close: 'إغلاق',
        section: 'ملاحظات الإصدار',
        setting: ({ version }: { version: string }) => `الجديد في MarkdownPoint ${version}`,
        settingDescription: 'اطّلع على ما تغيّر في الإصدارات الأخيرة.',
        view: 'عرض ملاحظات الإصدار',
        showOnUpdate: 'عرض ملاحظات الإصدار بعد التحديث'
    }
};
