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

import type { Translations } from "../index.ts";

export const ru: Translations = {
  name: "MarkdownPoint",
  outline: "Структура",
  sidebar: "Боковая панель",
  left: "Левая",
  right: "Правая",
  emptySlide: "Слайд без названия",
  fields: {
    text: "Текст",
    numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
    names: {
      title: "Название", body: "Основной текст", eyebrow: "Надзаголовок", heading: "Заголовок", subtitle: "Подзаголовок",
      caption: "Подпись", quote: "Цитата", attribution: "Автор", code: "Код", label: "Метка",
      footer: "Нижний колонтитул", number: "Число",
    },
  },
  images: { show: "Показывать изображения слайдов", description: "Показывать до пяти изображений под миниатюрой каждого слайда в редакторе.", preview: "Изображение слайда" },
  notes: { label: "Заметки докладчика", placeholder: "Заметки" },
  clipboard: { copyText: "Копировать", copyFailed: "Не удалось скопировать текст." },
  presentations: {
    new: "Новая презентация", name: "Имя", folder: "Папка", theme: "Тема", included: "Встроенная", root: "Корень хранилища",
    untitled: "Презентация без названия", create: "Создать", creating: "Создание…", cancel: "Отмена",
    invalidName: "Введите имя без косых черт и зарезервированных символов.",
    exists: "Файл или папка с таким именем уже существует.",
    failed: "Не удалось создать презентацию. Проверьте папку и повторите попытку.",
    openFailed: "Презентация создана, но открыть её не удалось. Откройте slides.md в папке презентации.",
    openChanged: "Презентация изменилась или недоступна для чтения. Повторите попытку.",
    handoffFailed: "Не удалось сохранить и открыть презентацию.",
    themeChanged: "Тема изменилась или недоступна. Откройте это окно снова и выберите тему ещё раз.",
  },
  slides: {
    new: "Новый слайд",
    shortcut: "Горячая клавиша",
    noShortcut: "Нет",
    shortcutHint: "Нажмите номер макета, чтобы использовать его. Щёлкните правой кнопкой мыши по макету, чтобы назначить горячую клавишу.",
    shortcutFailed: "Не удалось сохранить горячую клавишу.",
    layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => digit ? `${name}, горячая клавиша ${digit}` : name,
    layoutsUnavailable: "В этой презентации нет доступных макетов.",
    layoutChanged: "Макет изменился. Выберите его ещё раз.",
    newFailed: "Презентация изменилась до добавления слайда. Повторите попытку.",
    actions: "Действия со слайдом",
    copy: ({ count }: { count: number }) => count === 1 ? "Копировать слайд" : "Копировать слайды",
    cut: ({ count }: { count: number }) => count === 1 ? "Вырезать слайд" : "Вырезать слайды",
    cutChanged: "Презентация изменилась до вырезания слайдов. Они были только скопированы.",
    cutFailed: "Не удалось вырезать слайды. Они были только скопированы.",
    paste: "Вставить слайды",
    pasteEmpty: "Сначала скопируйте слайд в Obsidian.",
    pasteDestination: "Тема этой презентации не совпадает с темой этих слайдов. Скопируйте и вставьте их в приложении MarkdownPoint.",
    pasteVault: "Эти слайды из другого хранилища. Скопируйте и вставьте их в приложении MarkdownPoint.",
    pasteArtwork: "Графика темы в этих презентациях различается. Скопируйте и вставьте слайды в приложении MarkdownPoint.",
    pasteChanged: "Презентация изменилась до вставки слайдов. Повторите попытку.",
    pasteFailed: "Не удалось вставить слайды.",
    copyFailed: "Не удалось скопировать слайды.",
    copyUnavailable: "Не удалось прочитать презентацию или файлы её темы.",
    copyChanged: "Презентация изменилась до копирования слайдов. Повторите попытку.",
    delete: ({ count }: { count: number }) => count === 1 ? "Удалить слайд" : "Удалить слайды",
    deleteFailed: "Не удалось удалить слайды.",
    recoveryUnavailable: "Не удалось прочитать копии для восстановления на этом устройстве.",
    saveFailed: "Не удалось сохранить данные презентации. На этом устройстве хранится копия для восстановления.",
    retry: "Повторить",
    empty: "Нет слайдов",
  },
  commands: {
    newPresentation: "Новая презентация",
    openInMarkdownPoint: "Открыть в MarkdownPoint",
    newSlide: "Новый слайд",
    focusOutline: "Перейти к структуре",
    focusEditor: "Вернуться в редактор",
    moveSlidesUp: "Переместить слайды вверх",
    moveSlidesDown: "Переместить слайды вниз",
  },
};
