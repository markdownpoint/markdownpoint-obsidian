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

export const ru: Translations = {
    name: 'MarkdownPoint',
    outline: 'Структура',
    sidebar: 'Боковая панель',
    sidebarDescription:
        'Боковая панель, в которой отображается структура. Если вы используете Notebook Navigator, разместите структуру справа.',
    left: 'Левая',
    right: 'Правая',
    emptySlide: 'Слайд без названия',
    fields: {
        text: 'Текст',
        numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
        names: {
            title: 'Название',
            body: 'Основной текст',
            eyebrow: 'Надзаголовок',
            heading: 'Заголовок',
            subtitle: 'Подзаголовок',
            caption: 'Подпись',
            quote: 'Цитата',
            attribution: 'Автор',
            code: 'Код',
            label: 'Метка',
            footer: 'Нижний колонтитул',
            number: 'Число'
        }
    },
    images: {
        show: 'Показывать изображения',
        description: 'Показывать до пяти изображений под миниатюрой каждого слайда в редакторе.',
        preview: 'Изображение слайда'
    },
    notes: { label: 'Заметки докладчика', placeholder: 'Заметки' },
    clipboard: { copyText: 'Копировать', copyFailed: 'Не удалось скопировать текст.' },
    presentations: {
        new: 'Новая презентация',
        name: 'Имя',
        folder: 'Папка',
        theme: 'Тема',
        included: 'Встроенная',
        root: 'Корень хранилища',
        untitled: 'Презентация без названия',
        create: 'Создать',
        creating: 'Создание…',
        cancel: 'Отмена',
        invalidName: 'Введите имя без косых черт и зарезервированных символов.',
        exists: 'Файл или папка с таким именем уже существует. Введите другое имя.',
        insidePresentation: ({ presentation }: { presentation: string }) =>
            `MarkdownPoint не может создать презентацию внутри «${presentation}». Выберите папку вне «${presentation}».`,
        nested: ({ presentation, outer }: { presentation: string; outer: string }) =>
            `MarkdownPoint не может открыть презентацию «${presentation}», пока она находится внутри «${outer}». Переместите папку «${presentation}» из «${outer}», а затем откройте её.`,
        failed: 'Не удалось создать презентацию. Повторите попытку.',
        openFailed: 'MarkdownPoint создал презентацию, но не смог её открыть. Откройте slides.md в папке презентации.',
        openChanged: 'Презентация изменилась до того, как MarkdownPoint успел её открыть. Повторите попытку.',
        handoffFailed: 'Не удалось сохранить и открыть презентацию.',
        themeChanged: 'Не удалось создать презентацию на основе выбранной темы. Откройте это окно снова и выберите тему ещё раз.',
        newerFormat: ({ version }: { version: string }) =>
            `В этой презентации используется более новый формат MarkdownPoint версии ${version}. Обновите плагин MarkdownPoint, чтобы открыть её как презентацию.`,
        unreadableFile: ({ file, presentation }: { file: string; presentation: string }) =>
            `MarkdownPoint не может прочитать «${file}» в «${presentation}». Откройте презентацию в приложении MarkdownPoint, чтобы увидеть, что исправить.`,
        unreadable: ({ presentation }: { presentation: string }) =>
            `MarkdownPoint не может прочитать презентацию в «${presentation}». Откройте её в приложении MarkdownPoint, чтобы увидеть, что исправить.`
    },
    slides: {
        new: 'Добавить слайд',
        shortcut: 'Горячая клавиша',
        noShortcut: 'Нет',
        shortcutHint:
            'Нажмите горячую клавишу макета, чтобы выбрать его. Щёлкните правой кнопкой мыши по макету, чтобы назначить горячую клавишу.',
        shortcutFailed: 'Не удалось сохранить горячую клавишу.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) =>
            digit ? `${name}, горячая клавиша ${digit}` : name,
        layoutsUnavailable: 'В этой презентации нет доступных макетов.',
        layoutChanged: 'Макет изменился до того, как MarkdownPoint успел добавить слайд. Повторите попытку.',
        newFailed: 'Презентация изменилась до того, как MarkdownPoint успел добавить слайд. Повторите попытку.',
        actions: 'Действия со слайдом',
        copy: 'Копировать слайд',
        cut: 'Вырезать слайд',
        cutChanged:
            'Презентация изменилась до того, как MarkdownPoint успел вырезать слайды. Они находятся в буфере обмена и остались в презентации.',
        cutFailed: 'Не удалось вырезать слайды. Они находятся в буфере обмена и остались в презентации.',
        paste: 'Вставить слайд',
        pasteEmpty: 'Сначала скопируйте слайд в Obsidian.',
        pasteDestination: 'Тема этой презентации не совпадает с темой этих слайдов. Скопируйте и вставьте их в приложении MarkdownPoint.',
        pasteVault: 'Эти слайды из другого хранилища. Скопируйте и вставьте их в приложении MarkdownPoint.',
        pasteArtwork: 'У тем этих двух презентаций разная графика. Скопируйте и вставьте слайды в приложении MarkdownPoint.',
        pasteChanged: 'Презентация изменилась до того, как MarkdownPoint успел вставить слайды. Повторите попытку.',
        pasteFailed: 'Не удалось вставить слайды.',
        copyFailed: 'Не удалось скопировать слайды.',
        copyUnavailable: 'Не удалось прочитать презентацию или файлы её темы.',
        copyChanged: 'Презентация изменилась до того, как MarkdownPoint успел скопировать слайды. Повторите попытку.',
        copyNewer:
            'В этой презентации используется более новый формат MarkdownPoint. Обновите плагин MarkdownPoint, чтобы копировать или вырезать её слайды.',
        delete: 'Удалить слайд',
        deleteFailed: 'Не удалось удалить слайды.',
        recoveryUnavailable: 'Не удалось прочитать копии для восстановления на этом устройстве.',
        saveFailed: 'Не удалось сохранить данные презентации.',
        retry: 'Повторить',
        empty: 'Нет слайдов'
    },
    commands: {
        newPresentation: 'Новая презентация',
        openInMarkdownPoint: 'Открыть в MarkdownPoint',
        newSlide: 'Добавить слайд',
        focusOutline: 'Перейти к структуре',
        focusEditor: 'Вернуться в редактор',
        moveSlidesUp: 'Переместить слайд вверх',
        moveSlidesDown: 'Переместить слайд вниз'
    },
    whatsNew: {
        title: 'Что нового в MarkdownPoint',
        version: ({ version }: { version: string }) => `Версия ${version}`,
        new: 'Новое',
        improved: 'Улучшено',
        changed: 'Изменено',
        fixed: 'Исправлено',
        close: 'Закрыть',
        section: 'Примечания к выпуску',
        setting: ({ version }: { version: string }) => `Что нового в MarkdownPoint ${version}`,
        settingDescription: 'Что изменилось в последних выпусках.',
        view: 'Посмотреть примечания к выпуску',
        showOnUpdate: 'Показывать примечания к выпуску после обновления'
    }
};
