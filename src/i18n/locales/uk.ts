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

export const uk: Translations = {
    name: 'MarkdownPoint',
    outline: 'Вміст',
    sidebar: 'Бічна панель',
    sidebarDescription: 'Бічна панель, у якій відображається вміст. Якщо ви використовуєте Notebook Navigator, розмістіть вміст праворуч.',
    left: 'Ліва',
    right: 'Права',
    emptySlide: 'Слайд без заголовка',
    fields: {
        text: 'Текст',
        numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
        names: {
            title: 'Заголовок',
            body: 'Основний текст',
            eyebrow: 'Надзаголовок',
            heading: 'Рубрика',
            subtitle: 'Підзаголовок',
            caption: 'Підпис',
            quote: 'Цитата',
            attribution: 'Авторство',
            code: 'Код',
            label: 'Мітка',
            footer: 'Нижній колонтитул',
            number: 'Число'
        }
    },
    images: {
        show: 'Показувати зображення',
        description: 'Показувати до п’яти зображень під мініатюрою кожного слайда в редакторі.',
        preview: 'Зображення слайда'
    },
    notes: { label: 'Примітки доповідача', placeholder: 'Примітки' },
    clipboard: { copyText: 'Скопіювати', copyFailed: 'Не вдалося скопіювати текст.' },
    presentations: {
        new: 'Нова презентація',
        name: 'Назва',
        folder: 'Тека',
        theme: 'Тема',
        included: 'Вбудована',
        root: 'Корінь сховища',
        untitled: 'Презентація без назви',
        create: 'Створити',
        creating: 'Створення…',
        cancel: 'Скасувати',
        invalidName: 'Введіть назву без скісних рисок і зарезервованих символів.',
        exists: 'Файл або тека з такою назвою вже існує. Введіть іншу назву.',
        insidePresentation: ({ presentation }: { presentation: string }) =>
            `MarkdownPoint не може створити презентацію всередині «${presentation}». Виберіть теку поза «${presentation}».`,
        nested: ({ presentation, outer }: { presentation: string; outer: string }) =>
            `MarkdownPoint не може відкрити презентацію «${presentation}», поки вона перебуває всередині «${outer}». Перемістіть теку «${presentation}» з «${outer}», а потім відкрийте її.`,
        failed: 'Не вдалося створити презентацію. Спробуйте ще раз.',
        openFailed: 'MarkdownPoint створив презентацію, але не зміг її відкрити. Відкрийте slides.md у її теці.',
        openChanged: 'Презентація змінилася, перш ніж MarkdownPoint встиг її відкрити. Спробуйте ще раз.',
        handoffFailed: 'Не вдалося зберегти й відкрити презентацію.',
        themeChanged: 'Не вдалося створити презентацію на основі вибраної теми. Відкрийте це вікно знову й виберіть тему ще раз.',
        newerFormat: ({ version }: { version: string }) =>
            `Ця презентація використовує новіший формат MarkdownPoint версії ${version}. Оновіть додаток MarkdownPoint, щоб відкрити її як презентацію.`,
        unreadableFile: ({ file, presentation }: { file: string; presentation: string }) =>
            `MarkdownPoint не може прочитати «${file}» у «${presentation}». Відкрийте презентацію в застосунку MarkdownPoint, щоб побачити, що виправити.`,
        unreadable: ({ presentation }: { presentation: string }) =>
            `MarkdownPoint не може прочитати презентацію в «${presentation}». Відкрийте її в застосунку MarkdownPoint, щоб побачити, що виправити.`
    },
    slides: {
        new: 'Додати слайд',
        shortcut: 'Клавіша',
        noShortcut: 'Немає',
        shortcutHint: 'Натисніть клавішу макета, щоб вибрати його. Клацніть макет правою кнопкою, щоб призначити клавішу.',
        shortcutFailed: 'Не вдалося зберегти клавішу.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}, клавіша ${digit}` : name),
        layoutsUnavailable: 'У цій презентації немає доступних макетів.',
        layoutChanged: 'Макет змінився, перш ніж MarkdownPoint встиг додати слайд. Спробуйте ще раз.',
        newFailed: 'Презентація змінилася, перш ніж MarkdownPoint встиг додати слайд. Спробуйте ще раз.',
        actions: 'Дії зі слайдом',
        copy: 'Скопіювати слайд',
        cut: 'Вирізати слайд',
        cutChanged:
            'Презентація змінилася, перш ніж MarkdownPoint встиг вирізати слайди. Вони є в буфері обміну й залишилися в презентації.',
        cutFailed: 'Не вдалося вирізати слайди. Вони є в буфері обміну й залишилися в презентації.',
        paste: 'Вставити слайд',
        pasteEmpty: 'Спершу скопіюйте слайд в Obsidian.',
        pasteDestination: 'Тема цієї презентації не відповідає цим слайдам. Скопіюйте та вставте їх у застосунку MarkdownPoint.',
        pasteVault: 'Ці слайди з іншого сховища. Скопіюйте та вставте їх у застосунку MarkdownPoint.',
        pasteArtwork: 'Теми цих двох презентацій мають різну графіку. Скопіюйте та вставте слайди в застосунку MarkdownPoint.',
        pasteChanged: 'Презентація змінилася, перш ніж MarkdownPoint встиг вставити слайди. Спробуйте ще раз.',
        pasteFailed: 'Не вдалося вставити слайди.',
        copyFailed: 'Не вдалося скопіювати слайди.',
        copyUnavailable: 'Не вдалося прочитати презентацію або файли її теми.',
        copyChanged: 'Презентація змінилася, перш ніж MarkdownPoint встиг скопіювати слайди. Спробуйте ще раз.',
        copyNewer:
            'Ця презентація використовує новіший формат MarkdownPoint. Оновіть додаток MarkdownPoint, щоб копіювати або вирізати її слайди.',
        delete: 'Видалити слайд',
        deleteFailed: 'Не вдалося видалити слайди.',
        recoveryUnavailable: 'Не вдалося прочитати копії для відновлення на цьому пристрої.',
        saveFailed: 'Не вдалося зберегти дані презентації.',
        retry: 'Повторити',
        empty: 'Немає слайдів'
    },
    commands: {
        newPresentation: 'Нова презентація',
        openInMarkdownPoint: 'Відкрити в MarkdownPoint',
        newSlide: 'Додати слайд',
        focusOutline: 'Фокусуватися на вмісті',
        focusEditor: 'Фокусуватися на редакторі',
        moveSlidesUp: 'Перемістити слайд вгору',
        moveSlidesDown: 'Перемістити слайд вниз'
    },
    whatsNew: {
        title: 'Що нового в MarkdownPoint',
        version: ({ version }: { version: string }) => `Версія ${version}`,
        new: 'Нове',
        improved: 'Покращено',
        changed: 'Змінено',
        fixed: 'Виправлено',
        close: 'Закрити',
        section: 'Примітки до випуску',
        setting: ({ version }: { version: string }) => `Що нового в MarkdownPoint ${version}`,
        settingDescription: 'Що змінилося в останніх випусках.',
        view: 'Переглянути примітки до випуску',
        showOnUpdate: 'Показувати примітки до випуску після оновлення'
    }
};
