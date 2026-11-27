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

export const pl: Translations = {
    name: 'MarkdownPoint',
    outline: 'Konspekt',
    sidebar: 'Pasek boczny',
    sidebarDescription: 'Pasek boczny, na którym jest wyświetlany konspekt. Jeśli używasz Notebook Navigator, umieść konspekt po prawej.',
    left: 'Lewy',
    right: 'Prawy',
    emptySlide: 'Slajd bez tytułu',
    fields: {
        text: 'Tekst',
        numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
        names: {
            title: 'Tytuł',
            body: 'Treść',
            eyebrow: 'Nadtytuł',
            heading: 'Nagłówek',
            subtitle: 'Podtytuł',
            caption: 'Podpis',
            quote: 'Cytat',
            attribution: 'Autor',
            code: 'Kod',
            label: 'Etykieta',
            footer: 'Stopka',
            number: 'Liczba'
        }
    },
    images: {
        show: 'Pokaż obrazy',
        description: 'Pokazuje do pięciu obrazów pod miniaturą każdego slajdu w edytorze.',
        preview: 'Obraz slajdu'
    },
    notes: { label: 'Notatki prezentera', placeholder: 'Notatki' },
    clipboard: { copyText: 'Kopiuj', copyFailed: 'Nie udało się skopiować tekstu.' },
    presentations: {
        new: 'Nowa prezentacja',
        name: 'Nazwa',
        folder: 'Folder',
        theme: 'Motyw',
        included: 'Wbudowany',
        root: 'Folder główny',
        untitled: 'Prezentacja bez nazwy',
        create: 'Stwórz',
        creating: 'Tworzenie…',
        cancel: 'Anuluj',
        invalidName: 'Wprowadź nazwę bez ukośników i znaków zastrzeżonych.',
        exists: 'Istnieje już plik lub folder o tej nazwie. Wprowadź inną nazwę.',
        insidePresentation: ({ presentation }: { presentation: string }) =>
            `MarkdownPoint nie może stworzyć prezentacji wewnątrz folderu „${presentation}”. Wybierz folder poza nim.`,
        nested: ({ presentation, outer }: { presentation: string; outer: string }) =>
            `MarkdownPoint nie może otworzyć prezentacji „${presentation}”, dopóki znajduje się ona w folderze „${outer}”. Przenieś folder „${presentation}” poza folder „${outer}”, a następnie otwórz prezentację.`,
        failed: 'Nie udało się stworzyć prezentacji. Spróbuj ponownie.',
        openFailed: 'MarkdownPoint stworzył prezentację, ale nie udało mu się jej otworzyć. Otwórz plik slides.md w jej folderze.',
        openChanged: 'Prezentacja zmieniła się, zanim MarkdownPoint zdążył ją otworzyć. Spróbuj ponownie.',
        handoffFailed: 'Nie udało się zapisać i otworzyć prezentacji.',
        themeChanged:
            'Nie udało się stworzyć prezentacji na podstawie wybranego motywu. Otwórz ponownie to okno i wybierz motyw jeszcze raz.',
        newerFormat: ({ version }: { version: string }) =>
            `Ta prezentacja używa nowszego formatu MarkdownPoint, w wersji ${version}. Zaktualizuj wtyczkę MarkdownPoint, aby otworzyć ją jako prezentację.`,
        unreadableFile: ({ file, presentation }: { file: string; presentation: string }) =>
            `MarkdownPoint nie może odczytać pliku „${file}” w „${presentation}”. Otwórz prezentację w aplikacji MarkdownPoint, aby zobaczyć, co trzeba poprawić.`,
        unreadable: ({ presentation }: { presentation: string }) =>
            `MarkdownPoint nie może odczytać prezentacji w „${presentation}”. Otwórz ją w aplikacji MarkdownPoint, aby zobaczyć, co trzeba poprawić.`
    },
    slides: {
        new: 'Dodaj slajd',
        shortcut: 'Skrót',
        noShortcut: 'Brak',
        shortcutHint: 'Naciśnij skrót układu, aby go wybrać. Kliknij układ prawym przyciskiem, aby przypisać skrót.',
        shortcutFailed: 'Nie udało się zapisać skrótu.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}, skrót ${digit}` : name),
        layoutsUnavailable: 'W tej prezentacji nie ma dostępnych układów.',
        layoutChanged: 'Układ zmienił się, zanim MarkdownPoint zdążył dodać slajd. Spróbuj ponownie.',
        newFailed: 'Prezentacja zmieniła się, zanim MarkdownPoint zdążył dodać slajd. Spróbuj ponownie.',
        actions: 'Opcje slajdu',
        copy: 'Kopiuj slajd',
        cut: 'Wytnij slajd',
        cutChanged: 'Prezentacja zmieniła się, zanim MarkdownPoint zdążył wyciąć slajdy. Są w schowku i nadal znajdują się w prezentacji.',
        cutFailed: 'Nie udało się wyciąć slajdów. Są w schowku i nadal znajdują się w prezentacji.',
        paste: 'Wklej slajd',
        pasteEmpty: 'Najpierw skopiuj slajd w Obsidian.',
        pasteDestination: 'Motyw tej prezentacji nie pasuje do tych slajdów. Skopiuj je i wklej w aplikacji MarkdownPoint.',
        pasteVault: 'Te slajdy pochodzą z innego sejfu. Skopiuj je i wklej w aplikacji MarkdownPoint.',
        pasteArtwork: 'Motywy tych dwóch prezentacji mają różne grafiki. Skopiuj i wklej slajdy w aplikacji MarkdownPoint.',
        pasteChanged: 'Prezentacja zmieniła się, zanim MarkdownPoint zdążył wkleić slajdy. Spróbuj ponownie.',
        pasteFailed: 'Nie udało się wkleić slajdów.',
        copyFailed: 'Nie udało się skopiować slajdów.',
        copyUnavailable: 'Nie udało się odczytać prezentacji ani plików jej motywu.',
        copyChanged: 'Prezentacja zmieniła się, zanim MarkdownPoint zdążył skopiować slajdy. Spróbuj ponownie.',
        copyNewer:
            'Ta prezentacja używa nowszego formatu MarkdownPoint. Zaktualizuj wtyczkę MarkdownPoint, aby kopiować lub wycinać jej slajdy.',
        delete: 'Usuń slajd',
        deleteFailed: 'Nie udało się usunąć slajdów.',
        recoveryUnavailable: 'Nie udało się odczytać kopii zapasowych na tym urządzeniu.',
        saveFailed: 'Nie udało się zapisać danych prezentacji.',
        retry: 'Ponów',
        empty: 'Brak slajdów'
    },
    commands: {
        newPresentation: 'Nowa prezentacja',
        openInMarkdownPoint: 'Otwórz w MarkdownPoint',
        newSlide: 'Dodaj slajd',
        focusOutline: 'Aktywuj konspekt',
        focusEditor: 'Aktywuj edytor',
        moveSlidesUp: 'Przesuń slajd w górę',
        moveSlidesDown: 'Przesuń slajd w dół'
    },
    whatsNew: {
        title: 'Co nowego w MarkdownPoint',
        version: ({ version }: { version: string }) => `Wersja ${version}`,
        new: 'Nowe',
        improved: 'Ulepszone',
        changed: 'Zmienione',
        fixed: 'Poprawione',
        close: 'Zamknij',
        section: 'Informacje o wersji',
        setting: ({ version }: { version: string }) => `Co nowego w MarkdownPoint ${version}`,
        settingDescription: 'Zobacz, co zmieniło się w ostatnich wydaniach.',
        view: 'Zobacz informacje o wersji',
        showOnUpdate: 'Pokazuj informacje o wersji po aktualizacji'
    }
};
