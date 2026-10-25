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
    sidebarDescription:
        'Die Gliederung in der linken oder rechten Seitenleiste anzeigen. Wenn du Notebook Navigator verwendest, behalte sie rechts.',
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
        exists: 'Eine Datei oder ein Ordner mit diesem Namen existiert bereits.',
        failed: 'Die Präsentation konnte nicht erstellt werden. Prüfe den Ordner und versuche es erneut.',
        openFailed: 'Die Präsentation wurde erstellt, konnte aber nicht geöffnet werden. Öffne slides.md in ihrem Ordner.',
        openChanged: 'Die Präsentation hat sich geändert oder konnte nicht gelesen werden. Versuche es erneut.',
        handoffFailed: 'Die Präsentation konnte nicht gespeichert und geöffnet werden.',
        themeChanged: 'Das Thema hat sich geändert oder ist nicht verfügbar. Öffne diesen Dialog erneut und wähle es noch einmal.',
        newerFormat: ({ version }: { version: string }) =>
            `Diese Präsentation verwendet ein neueres MarkdownPoint-Format (${version}). Aktualisiere die MarkdownPoint-Erweiterung, um sie als Präsentation zu öffnen.`
    },
    slides: {
        new: 'Neue Folie',
        shortcut: 'Kurzbefehl',
        noShortcut: 'Keiner',
        shortcutHint: 'Drücke die Nummer eines Layouts, um es zu verwenden. Rechtsklicke auf ein Layout, um einen Kurzbefehl festzulegen.',
        shortcutFailed: 'Der Kurzbefehl konnte nicht gespeichert werden.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}, Kurzbefehl ${digit}` : name),
        layoutsUnavailable: 'In dieser Präsentation sind keine Layouts verfügbar.',
        layoutChanged: 'Das Layout hat sich geändert. Wähle es erneut.',
        newFailed: 'Die Präsentation hat sich geändert, bevor die Folie hinzugefügt werden konnte. Versuche es erneut.',
        actions: 'Folienaktionen',
        copy: ({ count }: { count: number }) => (count === 1 ? 'Folie kopieren' : 'Folien kopieren'),
        cut: ({ count }: { count: number }) => (count === 1 ? 'Folie ausschneiden' : 'Folien ausschneiden'),
        cutChanged: 'Die Präsentation hat sich geändert, bevor die Folien ausgeschnitten werden konnten. Sie wurden nur kopiert.',
        cutFailed: 'Die Folien konnten nicht ausgeschnitten werden. Sie wurden nur kopiert.',
        paste: 'Folien einfügen',
        pasteEmpty: 'Kopiere zuerst eine Folie in Obsidian.',
        pasteDestination:
            'Das Thema dieser Präsentation passt nicht zu diesen Folien. Kopiere sie in der MarkdownPoint-App und füge sie dort ein.',
        pasteVault: 'Diese Folien stammen aus einem anderen Vault. Kopiere sie in der MarkdownPoint-App und füge sie dort ein.',
        pasteArtwork:
            'Die Grafiken des Themas unterscheiden sich zwischen diesen Präsentationen. Kopiere die Folien in der MarkdownPoint-App und füge sie dort ein.',
        pasteChanged: 'Die Präsentation hat sich geändert, bevor die Folien eingefügt werden konnten. Versuche es erneut.',
        pasteFailed: 'Die Folien konnten nicht eingefügt werden.',
        copyFailed: 'Die Folien konnten nicht kopiert werden.',
        copyUnavailable: 'Die Präsentation oder die Dateien ihres Themas konnten nicht gelesen werden.',
        copyChanged: 'Die Präsentation hat sich geändert, bevor die Folien kopiert werden konnten. Versuche es erneut.',
        copyNewer:
            'Diese Präsentation verwendet ein neueres MarkdownPoint-Format. Aktualisiere die MarkdownPoint-Erweiterung, um ihre Folien zu kopieren oder auszuschneiden.',
        delete: ({ count }: { count: number }) => (count === 1 ? 'Folie löschen' : 'Folien löschen'),
        deleteFailed: 'Die Folien konnten nicht gelöscht werden.',
        recoveryUnavailable: 'Die Wiederherstellungskopien auf diesem Gerät konnten nicht gelesen werden.',
        saveFailed:
            'Die Präsentationsdaten konnten nicht gespeichert werden. Eine Wiederherstellungskopie bleibt auf diesem Gerät erhalten.',
        retry: 'Wiederholen',
        empty: 'Keine Folien'
    },
    commands: {
        newPresentation: 'Neue Präsentation',
        openInMarkdownPoint: 'In MarkdownPoint öffnen',
        newSlide: 'Neue Folie',
        focusOutline: 'Gliederung fokussieren',
        focusEditor: 'Editor fokussieren',
        moveSlidesUp: 'Folien nach oben verschieben',
        moveSlidesDown: 'Folien nach unten verschieben'
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
        view: 'Neuerungen ansehen',
        showOnUpdate: 'Versionshinweise nach Updates anzeigen',
        showOnUpdateDescription: 'Den Dialog mit den Neuerungen einmal nach jedem Update öffnen.'
    }
};
