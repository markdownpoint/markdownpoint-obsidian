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

export const fa: Translations = {
    name: 'MarkdownPoint',
    outline: 'نمای کلی',
    sidebar: 'نوار کناری',
    sidebarDescription:
        'نوار کناری‌ای که نمای کلی در آن نمایش داده می‌شود. اگر از Notebook Navigator استفاده می‌کنید، نمای کلی را در سمت راست بگذارید.',
    left: 'چپ',
    right: 'راست',
    emptySlide: 'اسلاید بی‌عنوان',
    fields: {
        text: 'متن',
        numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
        names: {
            title: 'عنوان',
            body: 'متن اصلی',
            eyebrow: 'روتیتر',
            heading: 'سرفصل',
            subtitle: 'زیرعنوان',
            caption: 'شرح',
            quote: 'نقل‌قول',
            attribution: 'گوینده',
            code: 'کد',
            label: 'برچسب',
            footer: 'پاصفحه',
            number: 'عدد'
        }
    },
    images: {
        show: 'نمایش تصاویر',
        description: 'حداکثر پنج تصویر را زیر تصویرک هر اسلاید در ویرایشگر نمایش دهید.',
        preview: 'تصویر اسلاید'
    },
    notes: { label: 'یادداشت‌های ارائه‌دهنده', placeholder: 'یادداشت‌ها' },
    clipboard: { copyText: 'کپی', copyFailed: 'متن کپی نشد.' },
    presentations: {
        new: 'ارائهٔ جدید',
        name: 'نام',
        folder: 'پوشه',
        theme: 'طرح زمینه',
        included: 'داخلی',
        root: 'پوشهٔ اصلی خزانه',
        untitled: 'ارائهٔ بی‌عنوان',
        create: 'ساختن',
        creating: 'در حال ساختن…',
        cancel: 'لغو',
        invalidName: 'نامی بدون خط مورب یا نویسه‌های غیرمجاز وارد کنید.',
        exists: 'پرونده یا پوشه‌ای به همین نام از قبل وجود دارد. نام دیگری وارد کنید.',
        insidePresentation: ({ presentation }: { presentation: string }) =>
            `ساختن ارائه داخل «${presentation}» با MarkdownPoint ممکن نیست. پوشه‌ای بیرون از «${presentation}» انتخاب کنید.`,
        nested: ({ presentation, outer }: { presentation: string; outer: string }) =>
            `باز کردن «${presentation}» با MarkdownPoint تا وقتی داخل «${outer}» است ممکن نیست. پوشهٔ «${presentation}» را به بیرون از «${outer}» منتقل کنید، سپس آن را باز کنید.`,
        failed: 'ارائه ساخته نشد. دوباره تلاش کنید.',
        openFailed: 'MarkdownPoint ارائه را ساخت اما نتوانست آن را باز کند. پروندهٔ slides.md را در پوشهٔ آن باز کنید.',
        openChanged: 'ارائه پیش از آنکه MarkdownPoint بتواند آن را باز کند تغییر کرد. دوباره تلاش کنید.',
        handoffFailed: 'ذخیره و باز کردن ارائه انجام نشد.',
        themeChanged: 'ارائه از طرح زمینهٔ انتخاب‌شده ساخته نشد. این پنجره را دوباره باز کنید و طرح زمینه را از نو انتخاب کنید.',
        newerFormat: ({ version }: { version: string }) =>
            `این ارائه از قالب جدیدتری از MarkdownPoint، نسخهٔ ${version}، استفاده می‌کند. برای باز کردن آن به‌صورت ارائه، افزونهٔ MarkdownPoint را به‌روز کنید.`,
        unreadableFile: ({ file, presentation }: { file: string; presentation: string }) =>
            `خواندن «${file}» در «${presentation}» با MarkdownPoint ممکن نیست. ارائه را در برنامهٔ MarkdownPoint باز کنید تا ببینید چه چیزی را باید اصلاح کنید.`,
        unreadable: ({ presentation }: { presentation: string }) =>
            `خواندن ارائهٔ داخل «${presentation}» با MarkdownPoint ممکن نیست. آن را در برنامهٔ MarkdownPoint باز کنید تا ببینید چه چیزی را باید اصلاح کنید.`
    },
    slides: {
        new: 'افزودن اسلاید',
        shortcut: 'میانبر',
        noShortcut: 'هیچ‌کدام',
        shortcutHint: 'برای انتخاب یک طرح‌بندی، میانبر آن را بزنید. برای تعیین میانبر، روی طرح‌بندی راست‌کلیک کنید.',
        shortcutFailed: 'میانبر ذخیره نشد.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}، میانبر ${digit}` : name),
        layoutsUnavailable: 'این ارائه هیچ طرح‌بندی‌ای ندارد.',
        layoutChanged: 'طرح‌بندی پیش از آنکه MarkdownPoint بتواند اسلاید را اضافه کند تغییر کرد. دوباره تلاش کنید.',
        newFailed: 'ارائه پیش از آنکه MarkdownPoint بتواند اسلاید را اضافه کند تغییر کرد. دوباره تلاش کنید.',
        actions: 'عملیات اسلاید',
        copy: 'کپی اسلاید',
        cut: 'برش اسلاید',
        cutChanged:
            'ارائه پیش از آنکه MarkdownPoint بتواند اسلایدها را برش بزند تغییر کرد. اسلایدها در کلیپ‌بورد هستند و هنوز در ارائه باقی‌اند.',
        cutFailed: 'برش اسلایدها انجام نشد. اسلایدها در کلیپ‌بورد هستند و هنوز در ارائه باقی‌اند.',
        paste: 'جاگذاری اسلاید',
        pasteEmpty: 'ابتدا یک اسلاید را در Obsidian کپی کنید.',
        pasteDestination: 'طرح زمینهٔ این ارائه با این اسلایدها مطابقت ندارد. آن‌ها را در برنامهٔ MarkdownPoint کپی و جاگذاری کنید.',
        pasteVault: 'این اسلایدها از خزانهٔ دیگری هستند. آن‌ها را در برنامهٔ MarkdownPoint کپی و جاگذاری کنید.',
        pasteArtwork: 'طرح‌های زمینهٔ این دو ارائه گرافیک متفاوتی دارند. اسلایدها را در برنامهٔ MarkdownPoint کپی و جاگذاری کنید.',
        pasteChanged: 'ارائه پیش از آنکه MarkdownPoint بتواند اسلایدها را جاگذاری کند تغییر کرد. دوباره تلاش کنید.',
        pasteFailed: 'اسلایدها جاگذاری نشدند.',
        copyFailed: 'اسلایدها کپی نشدند.',
        copyUnavailable: 'ارائه یا پرونده‌های طرح زمینهٔ آن خوانده نشد.',
        copyChanged: 'ارائه پیش از آنکه MarkdownPoint بتواند اسلایدها را کپی کند تغییر کرد. دوباره تلاش کنید.',
        copyNewer:
            'این ارائه از قالب جدیدتری از MarkdownPoint استفاده می‌کند. برای کپی یا برش اسلایدهای آن، افزونهٔ MarkdownPoint را به‌روز کنید.',
        delete: 'حذف اسلاید',
        deleteFailed: 'اسلایدها حذف نشدند.',
        recoveryUnavailable: 'نسخه‌های بازیابی در این دستگاه خوانده نشدند.',
        saveFailed: 'داده‌های ارائه ذخیره نشد.',
        retry: 'تلاش مجدد',
        empty: 'اسلایدی وجود ندارد'
    },
    commands: {
        newPresentation: 'ارائهٔ جدید',
        openInMarkdownPoint: 'باز کردن در MarkdownPoint',
        newSlide: 'افزودن اسلاید',
        focusOutline: 'تمرکز بر نمای کلی',
        focusEditor: 'تمرکز بر ویرایشگر',
        moveSlidesUp: 'بالا بردن اسلاید',
        moveSlidesDown: 'پایین آوردن اسلاید'
    },
    whatsNew: {
        title: 'تازه‌های MarkdownPoint',
        version: ({ version }: { version: string }) => `نسخهٔ ${version}`,
        new: 'تازه',
        improved: 'بهبودیافته',
        changed: 'تغییریافته',
        fixed: 'رفع‌شده',
        close: 'بستن',
        section: 'یادداشت‌های انتشار',
        setting: ({ version }: { version: string }) => `تازه‌های MarkdownPoint ${version}`,
        settingDescription: 'تغییرات نسخه‌های اخیر را ببینید.',
        view: 'دیدن یادداشت‌های انتشار',
        showOnUpdate: 'نمایش یادداشت‌های انتشار پس از به‌روزرسانی'
    }
};
