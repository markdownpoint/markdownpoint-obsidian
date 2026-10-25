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

export const pl: Translations = {
  name: "MarkdownPoint",
  outline: "Konspekt",
  sidebar: "Pasek boczny",
  left: "Lewy",
  right: "Prawy",
  emptySlide: "Slajd bez tytułu",
  fields: {
    text: "Tekst",
    numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
    names: {
      title: "Tytuł", body: "Treść", eyebrow: "Nadtytuł", heading: "Nagłówek", subtitle: "Podtytuł",
      caption: "Podpis", quote: "Cytat", attribution: "Autor", code: "Kod", label: "Etykieta",
      footer: "Stopka", number: "Liczba",
    },
  },
  images: { show: "Pokaż obrazy slajdów", description: "Pokazuje do pięciu obrazów pod miniaturą każdego slajdu w edytorze.", preview: "Obraz slajdu" },
  notes: { label: "Notatki prezentera", placeholder: "Notatki" },
  clipboard: { copyText: "Kopiuj", copyFailed: "Nie udało się skopiować tekstu." },
  presentations: {
    new: "Nowa prezentacja", name: "Nazwa", folder: "Folder", theme: "Motyw", included: "Wbudowany", root: "Folder główny",
    untitled: "Prezentacja bez nazwy", create: "Stwórz", creating: "Tworzenie…", cancel: "Anuluj",
    invalidName: "Wprowadź nazwę bez ukośników i znaków zastrzeżonych.",
    exists: "Istnieje już plik lub folder o tej nazwie.",
    failed: "Nie udało się stworzyć prezentacji. Sprawdź folder i spróbuj ponownie.",
    openFailed: "Prezentacja została stworzona, ale nie udało się jej otworzyć. Otwórz plik slides.md w jej folderze.",
    openChanged: "Prezentacja zmieniła się lub nie udało się jej odczytać. Spróbuj ponownie.",
    handoffFailed: "Nie udało się zapisać i otworzyć prezentacji.",
    themeChanged: "Motyw zmienił się lub jest niedostępny. Otwórz ponownie to okno i wybierz motyw jeszcze raz.",
  },
  slides: {
    new: "Nowy slajd",
    shortcut: "Skrót",
    noShortcut: "Brak",
    shortcutHint: "Naciśnij numer układu, aby go użyć. Kliknij układ prawym przyciskiem, aby przypisać skrót.",
    shortcutFailed: "Nie udało się zapisać skrótu.",
    layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => digit ? `${name}, skrót ${digit}` : name,
    layoutsUnavailable: "W tej prezentacji nie ma dostępnych układów.",
    layoutChanged: "Układ zmienił się. Wybierz go ponownie.",
    newFailed: "Prezentacja zmieniła się przed dodaniem slajdu. Spróbuj ponownie.",
    actions: "Opcje slajdu",
    copy: ({ count }: { count: number }) => count === 1 ? "Kopiuj slajd" : "Kopiuj slajdy",
    cut: ({ count }: { count: number }) => count === 1 ? "Wytnij slajd" : "Wytnij slajdy",
    cutChanged: "Prezentacja zmieniła się przed wycięciem slajdów. Zostały tylko skopiowane.",
    cutFailed: "Nie udało się wyciąć slajdów. Zostały tylko skopiowane.",
    paste: "Wklej slajdy",
    pasteEmpty: "Najpierw skopiuj slajd w Obsidian.",
    pasteDestination: "Motyw tej prezentacji nie pasuje do tych slajdów. Skopiuj je i wklej w aplikacji MarkdownPoint.",
    pasteVault: "Te slajdy pochodzą z innego sejfu. Skopiuj je i wklej w aplikacji MarkdownPoint.",
    pasteArtwork: "Te prezentacje mają różne grafiki motywu. Skopiuj i wklej slajdy w aplikacji MarkdownPoint.",
    pasteChanged: "Prezentacja zmieniła się przed wklejeniem slajdów. Spróbuj ponownie.",
    pasteFailed: "Nie udało się wkleić slajdów.",
    copyFailed: "Nie udało się skopiować slajdów.",
    copyUnavailable: "Nie udało się odczytać prezentacji ani plików jej motywu.",
    copyChanged: "Prezentacja zmieniła się przed skopiowaniem slajdów. Spróbuj ponownie.",
    delete: ({ count }: { count: number }) => count === 1 ? "Usuń slajd" : "Usuń slajdy",
    deleteFailed: "Nie udało się usunąć slajdów.",
    recoveryUnavailable: "Nie udało się odczytać kopii zapasowych na tym urządzeniu.",
    saveFailed: "Nie udało się zapisać danych prezentacji. Na tym urządzeniu zachowano kopię zapasową.",
    retry: "Ponów",
    empty: "Brak slajdów",
  },
  commands: {
    newPresentation: "Nowa prezentacja",
    openInMarkdownPoint: "Otwórz w MarkdownPoint",
    newSlide: "Nowy slajd",
    focusOutline: "Aktywuj konspekt",
    focusEditor: "Aktywuj edytor",
    moveSlidesUp: "Przesuń slajdy w górę",
    moveSlidesDown: "Przesuń slajdy w dół",
  },
};
