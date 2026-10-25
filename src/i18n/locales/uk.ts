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
        show: 'Показувати зображення слайдів',
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
        exists: 'Файл або тека з такою назвою вже існує.',
        failed: 'Не вдалося створити презентацію. Перевірте теку й спробуйте ще раз.',
        openFailed: 'Презентацію створено, але не вдалося відкрити. Відкрийте slides.md у її теці.',
        openChanged: 'Презентація змінилася або її не вдалося прочитати. Спробуйте ще раз.',
        handoffFailed: 'Не вдалося зберегти й відкрити презентацію.',
        themeChanged: 'Тема змінилася або недоступна. Відкрийте це вікно знову й виберіть її ще раз.',
        newerFormat: ({ version }: { version: string }) =>
            `Ця презентація використовує новіший формат MarkdownPoint (${version}). Оновіть додаток MarkdownPoint, щоб відкрити її як презентацію.`
    },
    slides: {
        new: 'Новий слайд',
        shortcut: 'Клавіша',
        noShortcut: 'Немає',
        shortcutHint: 'Натисніть номер макета, щоб використати його. Клацніть макет правою кнопкою, щоб призначити клавішу.',
        shortcutFailed: 'Не вдалося зберегти клавішу.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}, клавіша ${digit}` : name),
        layoutsUnavailable: 'У цій презентації немає доступних макетів.',
        layoutChanged: 'Макет змінився. Виберіть його ще раз.',
        newFailed: 'Презентація змінилася, перш ніж вдалося додати слайд. Спробуйте ще раз.',
        actions: 'Дії зі слайдом',
        copy: ({ count }: { count: number }) => (count === 1 ? 'Скопіювати слайд' : 'Скопіювати слайди'),
        cut: ({ count }: { count: number }) => (count === 1 ? 'Вирізати слайд' : 'Вирізати слайди'),
        cutChanged: 'Презентація змінилася, перш ніж вдалося вирізати слайди. Їх лише скопійовано.',
        cutFailed: 'Не вдалося вирізати слайди. Їх лише скопійовано.',
        paste: 'Вставити слайди',
        pasteEmpty: 'Спершу скопіюйте слайд в Obsidian.',
        pasteDestination: 'Тема цієї презентації не відповідає цим слайдам. Скопіюйте та вставте їх у застосунку MarkdownPoint.',
        pasteVault: 'Ці слайди з іншого сховища. Скопіюйте та вставте їх у застосунку MarkdownPoint.',
        pasteArtwork: 'Графіка теми в цих презентаціях відрізняється. Скопіюйте та вставте слайди в застосунку MarkdownPoint.',
        pasteChanged: 'Презентація змінилася, перш ніж вдалося вставити слайди. Спробуйте ще раз.',
        pasteFailed: 'Не вдалося вставити слайди.',
        copyFailed: 'Не вдалося скопіювати слайди.',
        copyUnavailable: 'Не вдалося прочитати презентацію або файли її теми.',
        copyChanged: 'Презентація змінилася, перш ніж вдалося скопіювати слайди. Спробуйте ще раз.',
        copyNewer:
            'Ця презентація використовує новіший формат MarkdownPoint. Оновіть додаток MarkdownPoint, щоб копіювати або вирізати її слайди.',
        delete: ({ count }: { count: number }) => (count === 1 ? 'Видалити слайд' : 'Видалити слайди'),
        deleteFailed: 'Не вдалося видалити слайди.',
        recoveryUnavailable: 'Не вдалося прочитати копії для відновлення на цьому пристрої.',
        saveFailed: 'Не вдалося зберегти дані презентації. Копія для відновлення залишається на цьому пристрої.',
        retry: 'Повторити',
        empty: 'Немає слайдів'
    },
    commands: {
        newPresentation: 'Нова презентація',
        openInMarkdownPoint: 'Відкрити в MarkdownPoint',
        newSlide: 'Новий слайд',
        focusOutline: 'Фокусуватися на вмісті',
        focusEditor: 'Фокусуватися на редакторі',
        moveSlidesUp: 'Перемістити слайди вгору',
        moveSlidesDown: 'Перемістити слайди вниз'
    },
    whatsNew: {
        title: 'Що нового в MarkdownPoint',
        version: ({ version }: { version: string }) => `Версія ${version}`,
        new: 'Нове',
        improved: 'Покращено',
        changed: 'Змінено',
        fixed: 'Виправлено',
        close: 'Закрити',
        setting: ({ version }: { version: string }) => `Що нового в MarkdownPoint ${version}`,
        settingDescription: 'Що змінилося в останніх випусках.',
        view: 'Переглянути оновлення',
        showOnUpdate: 'Показувати вікно «Що нового» після оновлення',
        showOnUpdateDescription: 'Відкриває вікно «Що нового» один раз після кожного оновлення.'
    }
};
