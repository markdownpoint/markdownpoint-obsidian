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

export const de: Translations = {
    name: 'MarkdownPoint',
    outline: 'Gliederung',
    sidebar: 'Seitenleiste',
    sidebarDescription: 'Die Seitenleiste mit der Gliederung. Wenn du Notebook Navigator verwendest, zeige die Gliederung rechts an.',
    left: 'Links',
    right: 'Rechts',
    emptySlide: 'Folie ohne Titel',
    fields: {
        text: 'Text',
        numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
        names: {
            title: 'Titel',
            body: 'Text',
            eyebrow: 'Dachzeile',
            heading: 'Überschrift',
            subtitle: 'Unterzeile',
            caption: 'Untertitel',
            quote: 'Zitat',
            attribution: 'Quellenangabe',
            code: 'Code',
            label: 'Beschriftung',
            footer: 'Fußzeile',
            number: 'Nummer'
        }
    },
    images: {
        show: 'Bilder anzeigen',
        description: 'Bis zu fünf Bilder unter der Miniatur jeder Folie im Editor anzeigen.',
        preview: 'Folienbild'
    },
    notes: { label: 'Moderatornotizen', placeholder: 'Notizen' },
    clipboard: { copyText: 'Kopieren', copyFailed: 'Der Text konnte nicht kopiert werden.' },
    presentations: {
        new: 'Neue Präsentation',
        name: 'Name',
        folder: 'Ordner',
        theme: 'Thema',
        included: 'Mitgeliefert',
        root: 'Vault-Hauptordner',
        untitled: 'Unbenannte Präsentation',
        create: 'Erstellen',
        creating: 'Wird erstellt …',
        cancel: 'Abbrechen',
        invalidName: 'Gib einen Namen ohne Schrägstriche oder reservierte Zeichen ein.',
        exists: 'Eine Datei oder ein Ordner mit diesem Namen existiert bereits. Gib einen anderen Namen ein.',
        insidePresentation: ({ presentation }: { presentation: string }) =>
            `MarkdownPoint kann in „${presentation}“ keine Präsentation erstellen. Wähle einen Ordner außerhalb davon.`,
        nested: ({ presentation, outer }: { presentation: string; outer: string }) =>
            `MarkdownPoint kann die Präsentation „${presentation}“ nicht öffnen, solange sie in „${outer}“ liegt. Verschiebe den Ordner „${presentation}“ aus „${outer}“ und öffne dann „${presentation}“.`,
        failed: 'Die Präsentation konnte nicht erstellt werden. Versuche es erneut.',
        openFailed: 'MarkdownPoint hat die Präsentation erstellt, konnte sie aber nicht öffnen. Öffne slides.md in ihrem Ordner.',
        openChanged: 'Die Präsentation hat sich geändert, bevor MarkdownPoint sie öffnen konnte. Versuche es erneut.',
        handoffFailed: 'Die Präsentation konnte nicht gespeichert und geöffnet werden.',
        themeChanged:
            'Aus dem gewählten Thema konnte keine Präsentation erstellt werden. Öffne diesen Dialog erneut und wähle das Thema noch einmal.',
        newerFormat: ({ version }: { version: string }) =>
            `Diese Präsentation verwendet ein neueres MarkdownPoint-Format, Version ${version}. Aktualisiere die MarkdownPoint-Erweiterung, um sie als Präsentation zu öffnen.`,
        unreadableFile: ({ file, presentation }: { file: string; presentation: string }) =>
            `MarkdownPoint kann „${file}“ in „${presentation}“ nicht lesen. Öffne die Präsentation in der MarkdownPoint-App, um zu sehen, was zu korrigieren ist.`,
        unreadable: ({ presentation }: { presentation: string }) =>
            `MarkdownPoint kann die Präsentation in „${presentation}“ nicht lesen. Öffne sie in der MarkdownPoint-App, um zu sehen, was zu korrigieren ist.`
    },
    slides: {
        new: 'Folie hinzufügen',
        shortcut: 'Kurzbefehl',
        noShortcut: 'Keiner',
        shortcutHint:
            'Drücke den Kurzbefehl eines Layouts, um es auszuwählen. Rechtsklicke auf ein Layout, um einen Kurzbefehl festzulegen.',
        shortcutFailed: 'Der Kurzbefehl konnte nicht gespeichert werden.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}, Kurzbefehl ${digit}` : name),
        layoutsUnavailable: 'In dieser Präsentation sind keine Layouts verfügbar.',
        layoutChanged: 'Das Layout hat sich geändert, bevor MarkdownPoint die Folie hinzufügen konnte. Versuche es erneut.',
        newFailed: 'Die Präsentation hat sich geändert, bevor MarkdownPoint die Folie hinzufügen konnte. Versuche es erneut.',
        actions: 'Folienaktionen',
        copy: 'Folie kopieren',
        cut: 'Folie ausschneiden',
        cutChanged:
            'Die Präsentation hat sich geändert, bevor MarkdownPoint die Folien ausschneiden konnte. Sie sind in der Zwischenablage und weiterhin in der Präsentation.',
        cutFailed: 'Die Folien konnten nicht ausgeschnitten werden. Sie sind in der Zwischenablage und weiterhin in der Präsentation.',
        paste: 'Folie einfügen',
        pasteEmpty: 'Kopiere zuerst eine Folie in Obsidian.',
        pasteDestination:
            'Das Thema dieser Präsentation passt nicht zu diesen Folien. Kopiere sie in der MarkdownPoint-App und füge sie dort ein.',
        pasteVault: 'Diese Folien stammen aus einem anderen Vault. Kopiere sie in der MarkdownPoint-App und füge sie dort ein.',
        pasteArtwork:
            'Die Themen der beiden Präsentationen haben unterschiedliche Grafiken. Kopiere die Folien in der MarkdownPoint-App und füge sie dort ein.',
        pasteChanged: 'Die Präsentation hat sich geändert, bevor MarkdownPoint die Folien einfügen konnte. Versuche es erneut.',
        pasteFailed: 'Die Folien konnten nicht eingefügt werden.',
        copyFailed: 'Die Folien konnten nicht kopiert werden.',
        copyUnavailable: 'Die Präsentation oder die Dateien ihres Themas konnten nicht gelesen werden.',
        copyChanged: 'Die Präsentation hat sich geändert, bevor MarkdownPoint die Folien kopieren konnte. Versuche es erneut.',
        copyNewer:
            'Diese Präsentation verwendet ein neueres MarkdownPoint-Format. Aktualisiere die MarkdownPoint-Erweiterung, um ihre Folien zu kopieren oder auszuschneiden.',
        delete: 'Folie löschen',
        deleteFailed: 'Die Folien konnten nicht gelöscht werden.',
        recoveryUnavailable: 'Die Wiederherstellungskopien auf diesem Gerät konnten nicht gelesen werden.',
        saveFailed: 'Die Präsentationsdaten konnten nicht gespeichert werden.',
        retry: 'Wiederholen',
        empty: 'Keine Folien'
    },
    commands: {
        newPresentation: 'Neue Präsentation',
        openInMarkdownPoint: 'In MarkdownPoint öffnen',
        newSlide: 'Folie hinzufügen',
        focusOutline: 'Gliederung fokussieren',
        focusEditor: 'Editor fokussieren',
        moveSlidesUp: 'Folie nach oben verschieben',
        moveSlidesDown: 'Folie nach unten verschieben'
    },
    whatsNew: {
        title: 'Neu in MarkdownPoint',
        version: ({ version }: { version: string }) => `Version ${version}`,
        new: 'Neu',
        improved: 'Verbessert',
        changed: 'Geändert',
        fixed: 'Behoben',
        close: 'Schließen',
        section: 'Versionshinweise',
        setting: ({ version }: { version: string }) => `Neu in MarkdownPoint ${version}`,
        settingDescription: 'Was sich in den letzten Versionen geändert hat.',
        view: 'Versionshinweise ansehen',
        showOnUpdate: 'Versionshinweise nach Updates anzeigen'
    }
};
