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
        show: 'نمایش تصاویر اسلایدها',
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
        exists: 'پرونده یا پوشه‌ای به همین نام از قبل وجود دارد.',
        failed: 'ارائه ساخته نشد. پوشه را بررسی کنید و دوباره تلاش کنید.',
        openFailed: 'ارائه ساخته شد اما باز نشد. پروندهٔ slides.md را در پوشهٔ آن باز کنید.',
        openChanged: 'ارائه تغییر کرده یا خوانده نشد. دوباره تلاش کنید.',
        handoffFailed: 'ذخیره و باز کردن ارائه انجام نشد.',
        themeChanged: 'طرح زمینه تغییر کرده یا در دسترس نیست. این پنجره را دوباره باز کنید و آن را از نو انتخاب کنید.'
    },
    slides: {
        new: 'اسلاید جدید',
        shortcut: 'میانبر',
        noShortcut: 'هیچ‌کدام',
        shortcutHint: 'برای استفاده از یک طرح‌بندی، شمارهٔ آن را بزنید. برای تعیین میانبر، روی طرح‌بندی راست‌کلیک کنید.',
        shortcutFailed: 'میانبر ذخیره نشد.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}، میانبر ${digit}` : name),
        layoutsUnavailable: 'این ارائه هیچ طرح‌بندی‌ای ندارد.',
        layoutChanged: 'طرح‌بندی تغییر کرده است. آن را دوباره انتخاب کنید.',
        newFailed: 'ارائه پیش از افزوده شدن اسلاید تغییر کرد. دوباره تلاش کنید.',
        actions: 'عملیات اسلاید',
        copy: ({ count }: { count: number }) => (count === 1 ? 'کپی اسلاید' : 'کپی اسلایدها'),
        cut: ({ count }: { count: number }) => (count === 1 ? 'برش اسلاید' : 'برش اسلایدها'),
        cutChanged: 'ارائه پیش از برش اسلایدها تغییر کرد. اسلایدها فقط کپی شدند.',
        cutFailed: 'برش اسلایدها انجام نشد. اسلایدها فقط کپی شدند.',
        paste: 'جاگذاری اسلایدها',
        pasteEmpty: 'ابتدا یک اسلاید را در Obsidian کپی کنید.',
        pasteDestination: 'طرح زمینهٔ این ارائه با این اسلایدها مطابقت ندارد. آن‌ها را در برنامهٔ MarkdownPoint کپی و جاگذاری کنید.',
        pasteVault: 'این اسلایدها از خزانهٔ دیگری هستند. آن‌ها را در برنامهٔ MarkdownPoint کپی و جاگذاری کنید.',
        pasteArtwork: 'گرافیک طرح زمینه در این ارائه‌ها یکسان نیست. اسلایدها را در برنامهٔ MarkdownPoint کپی و جاگذاری کنید.',
        pasteChanged: 'ارائه پیش از جاگذاری اسلایدها تغییر کرد. دوباره تلاش کنید.',
        pasteFailed: 'اسلایدها جاگذاری نشدند.',
        copyFailed: 'اسلایدها کپی نشدند.',
        copyUnavailable: 'ارائه یا پرونده‌های طرح زمینهٔ آن خوانده نشد.',
        copyChanged: 'ارائه پیش از کپی اسلایدها تغییر کرد. دوباره تلاش کنید.',
        delete: ({ count }: { count: number }) => (count === 1 ? 'حذف اسلاید' : 'حذف اسلایدها'),
        deleteFailed: 'اسلایدها حذف نشدند.',
        recoveryUnavailable: 'نسخه‌های بازیابی در این دستگاه خوانده نشدند.',
        saveFailed: 'داده‌های ارائه ذخیره نشد. یک نسخهٔ بازیابی در این دستگاه نگه داشته می‌شود.',
        retry: 'تلاش مجدد',
        empty: 'اسلایدی وجود ندارد'
    },
    commands: {
        newPresentation: 'ارائهٔ جدید',
        openInMarkdownPoint: 'باز کردن در MarkdownPoint',
        newSlide: 'اسلاید جدید',
        focusOutline: 'تمرکز بر نمای کلی',
        focusEditor: 'تمرکز بر ویرایشگر',
        moveSlidesUp: 'بالا بردن اسلایدها',
        moveSlidesDown: 'پایین آوردن اسلایدها'
    }
};
