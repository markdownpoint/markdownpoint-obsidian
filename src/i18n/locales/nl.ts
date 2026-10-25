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

export const nl: Translations = {
    name: 'MarkdownPoint',
    outline: 'Overzicht',
    sidebar: 'Zijbalk',
    sidebarDescription: 'Toon het overzicht in de linker- of rechterzijbalk. Houd het rechts als je Notebook Navigator gebruikt.',
    left: 'Links',
    right: 'Rechts',
    emptySlide: 'Dia zonder titel',
    fields: {
        text: 'Tekst',
        numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
        names: {
            title: 'Titel',
            body: 'Hoofdtekst',
            eyebrow: 'Bovenkop',
            heading: 'Kop',
            subtitle: 'Ondertitel',
            caption: 'Bijschrift',
            quote: 'Citaat',
            attribution: 'Bron',
            code: 'Code',
            label: 'Label',
            footer: 'Voettekst',
            number: 'Getal'
        }
    },
    images: {
        show: 'Afbeeldingen tonen',
        description: 'Toon maximaal vijf afbeeldingen onder de miniatuur van elke dia in de editor.',
        preview: 'Dia-afbeelding'
    },
    notes: { label: 'Presentatornotities', placeholder: 'Notities' },
    clipboard: { copyText: 'Kopiëren', copyFailed: 'Kon de tekst niet kopiëren.' },
    presentations: {
        new: 'Nieuwe presentatie',
        name: 'Naam',
        folder: 'Map',
        theme: 'Thema',
        included: 'Meegeleverd',
        root: 'Kluismap',
        untitled: 'Naamloze presentatie',
        create: 'Aanmaken',
        creating: 'Aanmaken…',
        cancel: 'Annuleren',
        invalidName: 'Voer een naam in zonder schuine strepen of gereserveerde tekens.',
        exists: 'Er bestaat al een bestand of map met deze naam.',
        failed: 'Kon de presentatie niet aanmaken. Controleer de map en probeer het opnieuw.',
        openFailed: 'De presentatie is aangemaakt, maar kon niet worden geopend. Open slides.md in de map van de presentatie.',
        openChanged: 'De presentatie is gewijzigd of kon niet worden gelezen. Probeer het opnieuw.',
        handoffFailed: 'Kon de presentatie niet opslaan en openen.',
        themeChanged: 'Het thema is gewijzigd of niet beschikbaar. Open dit venster opnieuw en kies het thema nogmaals.',
        newerFormat: ({ version }: { version: string }) =>
            `Deze presentatie gebruikt een nieuwere MarkdownPoint-indeling (${version}). Werk de MarkdownPoint-plug-in bij om deze als presentatie te openen.`
    },
    slides: {
        new: 'Nieuwe dia',
        shortcut: 'Sneltoets',
        noShortcut: 'Geen',
        shortcutHint:
            'Druk op het nummer van een lay-out om die te gebruiken. Klik met de rechtermuisknop op een lay-out om een sneltoets toe te wijzen.',
        shortcutFailed: 'Kon de sneltoets niet opslaan.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}, sneltoets ${digit}` : name),
        layoutsUnavailable: 'Er zijn geen lay-outs beschikbaar in deze presentatie.',
        layoutChanged: 'De lay-out is gewijzigd. Kies de lay-out opnieuw.',
        newFailed: 'De presentatie is gewijzigd voordat de dia kon worden toegevoegd. Probeer het opnieuw.',
        actions: 'Dia-acties',
        copy: ({ count }: { count: number }) => (count === 1 ? 'Dia kopiëren' : 'Dia’s kopiëren'),
        cut: ({ count }: { count: number }) => (count === 1 ? 'Dia knippen' : 'Dia’s knippen'),
        cutChanged: 'De presentatie is gewijzigd voordat de dia’s konden worden geknipt. Ze zijn alleen gekopieerd.',
        cutFailed: 'Kon de dia’s niet knippen. Ze zijn alleen gekopieerd.',
        paste: 'Dia’s plakken',
        pasteEmpty: 'Kopieer eerst een dia in Obsidian.',
        pasteDestination: 'Het thema van deze presentatie past niet bij deze dia’s. Kopieer en plak ze in de MarkdownPoint-app.',
        pasteVault: 'Deze dia’s komen uit een andere kluis. Kopieer en plak ze in de MarkdownPoint-app.',
        pasteArtwork:
            'De afbeeldingen van het thema verschillen tussen deze presentaties. Kopieer en plak de dia’s in de MarkdownPoint-app.',
        pasteChanged: 'De presentatie is gewijzigd voordat de dia’s konden worden geplakt. Probeer het opnieuw.',
        pasteFailed: 'Kon de dia’s niet plakken.',
        copyFailed: 'Kon de dia’s niet kopiëren.',
        copyUnavailable: 'Kon de presentatie of de themabestanden niet lezen.',
        copyChanged: 'De presentatie is gewijzigd voordat de dia’s konden worden gekopieerd. Probeer het opnieuw.',
        copyNewer:
            'Deze presentatie gebruikt een nieuwere MarkdownPoint-indeling. Werk de MarkdownPoint-plug-in bij om de dia’s te kopiëren of te knippen.',
        delete: ({ count }: { count: number }) => (count === 1 ? 'Dia verwijderen' : 'Dia’s verwijderen'),
        deleteFailed: 'Kon de dia’s niet verwijderen.',
        recoveryUnavailable: 'Kon de herstelkopieën op dit apparaat niet lezen.',
        saveFailed: 'Kon de presentatiegegevens niet opslaan. Er blijft een herstelkopie op dit apparaat bewaard.',
        retry: 'Opnieuw proberen',
        empty: 'Geen dia’s'
    },
    commands: {
        newPresentation: 'Nieuwe presentatie',
        openInMarkdownPoint: 'Openen in MarkdownPoint',
        newSlide: 'Nieuwe dia',
        focusOutline: 'Focus op het overzicht',
        focusEditor: 'Focus op de editor',
        moveSlidesUp: 'Dia’s omhoog verplaatsen',
        moveSlidesDown: 'Dia’s omlaag verplaatsen'
    },
    whatsNew: {
        title: 'Nieuw in MarkdownPoint',
        version: ({ version }: { version: string }) => `Versie ${version}`,
        new: 'Nieuw',
        improved: 'Verbeterd',
        changed: 'Gewijzigd',
        fixed: 'Opgelost',
        close: 'Sluiten',
        section: 'Releasenotes',
        setting: ({ version }: { version: string }) => `Nieuw in MarkdownPoint ${version}`,
        settingDescription: 'Bekijk wat er in recente versies is veranderd.',
        view: 'Bekijk recente updates',
        showOnUpdate: 'Releasenotes tonen na een update',
        showOnUpdateDescription: 'Open na elke update één keer het venster met wat er nieuw is.'
    }
};
