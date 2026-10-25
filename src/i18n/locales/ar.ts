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
        exists: 'يوجد ملف أو مجلد بهذا الاسم بالفعل.',
        failed: 'تعذّر إنشاء العرض التقديمي. تحقق من المجلد وحاول مرة أخرى.',
        openFailed: 'تم إنشاء العرض التقديمي لكن تعذّر فتحه. افتح slides.md في مجلده.',
        openChanged: 'تغيّر العرض التقديمي أو تعذّرت قراءته. حاول مرة أخرى.',
        handoffFailed: 'تعذّر حفظ العرض التقديمي وفتحه.',
        themeChanged: 'تغيّرت السمة أو أصبحت غير متاحة. أعد فتح هذه النافذة واخترها مرة أخرى.',
        newerFormat: ({ version }: { version: string }) =>
            `يستخدم هذا العرض التقديمي إصدارًا أحدث من تنسيق MarkdownPoint (${version}). حدّث إضافة MarkdownPoint لفتحه كعرض تقديمي.`
    },
    slides: {
        new: 'شريحة جديدة',
        shortcut: 'الاختصار',
        noShortcut: 'لا شيء',
        shortcutHint: 'اضغط على رقم التخطيط لاستخدامه. انقر بزر الماوس الأيمن على تخطيط لتعيين اختصار له.',
        shortcutFailed: 'تعذّر حفظ الاختصار.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}، الاختصار ${digit}` : name),
        layoutsUnavailable: 'لا تتوفر تخطيطات في هذا العرض التقديمي.',
        layoutChanged: 'تغيّر التخطيط. اختره مرة أخرى.',
        newFailed: 'تغيّر العرض التقديمي قبل إضافة الشريحة. حاول مرة أخرى.',
        actions: 'إجراءات الشريحة',
        copy: ({ count }: { count: number }) => (count === 1 ? 'نسخ الشريحة' : 'نسخ الشرائح'),
        cut: ({ count }: { count: number }) => (count === 1 ? 'قص الشريحة' : 'قص الشرائح'),
        cutChanged: 'تغيّر العرض التقديمي قبل قص الشرائح. تم نسخها فقط.',
        cutFailed: 'تعذّر قص الشرائح. تم نسخها فقط.',
        paste: 'لصق الشرائح',
        pasteEmpty: 'انسخ شريحة في Obsidian أولًا.',
        pasteDestination: 'سمة هذا العرض التقديمي لا تطابق هذه الشرائح. انسخها والصقها في تطبيق MarkdownPoint.',
        pasteVault: 'هذه الشرائح من خزنة أخرى. انسخها والصقها في تطبيق MarkdownPoint.',
        pasteArtwork: 'تختلف رسومات السمة بين هذين العرضين التقديميين. انسخ الشرائح والصقها في تطبيق MarkdownPoint.',
        pasteChanged: 'تغيّر العرض التقديمي قبل لصق الشرائح. حاول مرة أخرى.',
        pasteFailed: 'تعذّر لصق الشرائح.',
        copyFailed: 'تعذّر نسخ الشرائح.',
        copyUnavailable: 'تعذّرت قراءة العرض التقديمي أو ملفات سمته.',
        copyChanged: 'تغيّر العرض التقديمي قبل نسخ الشرائح. حاول مرة أخرى.',
        copyNewer: 'يستخدم هذا العرض التقديمي إصدارًا أحدث من تنسيق MarkdownPoint. حدّث إضافة MarkdownPoint لنسخ شرائحه أو قصها.',
        delete: ({ count }: { count: number }) => (count === 1 ? 'حذف الشريحة' : 'حذف الشرائح'),
        deleteFailed: 'تعذّر حذف الشرائح.',
        recoveryUnavailable: 'تعذّرت قراءة نُسخ الاسترداد على هذا الجهاز.',
        saveFailed: 'تعذّر حفظ بيانات العرض التقديمي. يُحتفظ بنسخة استرداد على هذا الجهاز.',
        retry: 'إعادة المحاولة',
        empty: 'لا توجد شرائح'
    },
    commands: {
        newPresentation: 'عرض تقديمي جديد',
        openInMarkdownPoint: 'فتح في MarkdownPoint',
        newSlide: 'شريحة جديدة',
        focusOutline: 'التركيز على المخطط التفصيلي',
        focusEditor: 'التركيز على المحرر',
        moveSlidesUp: 'نقل الشرائح للأعلى',
        moveSlidesDown: 'نقل الشرائح للأسفل'
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
        view: 'عرض التحديثات الأخيرة',
        showOnUpdate: 'عرض الجديد بعد التحديث',
        showOnUpdateDescription: 'فتح مربع حوار «الجديد» مرة واحدة بعد كل تحديث.'
    }
};
