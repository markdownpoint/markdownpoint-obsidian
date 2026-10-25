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

export const it: Translations = {
    name: 'MarkdownPoint',
    outline: 'Struttura',
    sidebar: 'Barra laterale',
    sidebarDescription: 'Mostra la struttura nella barra laterale sinistra o destra. Se usi Notebook Navigator, tienila a destra.',
    left: 'Sinistra',
    right: 'Destra',
    emptySlide: 'Diapositiva senza titolo',
    fields: {
        text: 'Testo',
        numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
        names: {
            title: 'Titolo',
            body: 'Corpo',
            eyebrow: 'Occhiello',
            heading: 'Intestazione',
            subtitle: 'Sottotitolo',
            caption: 'Didascalia',
            quote: 'Citazione',
            attribution: 'Attribuzione',
            code: 'Codice',
            label: 'Etichetta',
            footer: 'Piè di pagina',
            number: 'Numero'
        }
    },
    images: {
        show: 'Mostra immagini',
        description: 'Mostra fino a cinque immagini sotto la miniatura di ogni diapositiva nell’editor.',
        preview: 'Immagine della diapositiva'
    },
    notes: { label: 'Note del presentatore', placeholder: 'Note' },
    clipboard: { copyText: 'Copia', copyFailed: 'Impossibile copiare il testo.' },
    presentations: {
        new: 'Nuova presentazione',
        name: 'Nome',
        folder: 'Cartella',
        theme: 'Tema',
        included: 'Incluso',
        root: 'Cartella principale del vault',
        untitled: 'Presentazione senza titolo',
        create: 'Crea',
        creating: 'Creazione…',
        cancel: 'Annulla',
        invalidName: 'Inserisci un nome senza barre né caratteri riservati.',
        exists: 'Esiste già un file o una cartella con questo nome.',
        failed: 'Impossibile creare la presentazione. Controlla la cartella e riprova.',
        openFailed: 'Presentazione creata, ma impossibile aprirla. Apri slides.md nella sua cartella.',
        openChanged: 'La presentazione è stata modificata o non è leggibile. Riprova.',
        handoffFailed: 'Impossibile salvare e aprire la presentazione.',
        themeChanged: 'Il tema è stato modificato o non è disponibile. Riapri questa finestra e sceglilo di nuovo.',
        newerFormat: ({ version }: { version: string }) =>
            `Questa presentazione usa un formato MarkdownPoint più recente (${version}). Aggiorna il plugin MarkdownPoint per aprirla come presentazione.`
    },
    slides: {
        new: 'Nuova diapositiva',
        shortcut: 'Scorciatoia',
        noShortcut: 'Nessuna',
        shortcutHint: 'Premi il numero di un layout per usarlo. Fai clic destro su un layout per assegnare una scorciatoia.',
        shortcutFailed: 'Impossibile salvare la scorciatoia.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}, scorciatoia ${digit}` : name),
        layoutsUnavailable: 'Nessun layout disponibile in questa presentazione.',
        layoutChanged: 'Il layout è stato modificato. Sceglilo di nuovo.',
        newFailed: 'La presentazione è stata modificata e la diapositiva non è stata aggiunta. Riprova.',
        actions: 'Azioni diapositiva',
        copy: ({ count }: { count: number }) => (count === 1 ? 'Copia diapositiva' : 'Copia diapositive'),
        cut: ({ count }: { count: number }) => (count === 1 ? 'Taglia diapositiva' : 'Taglia diapositive'),
        cutChanged: 'La presentazione è stata modificata e le diapositive non sono state tagliate, ma solo copiate.',
        cutFailed: 'Impossibile tagliare le diapositive. Sono state solo copiate.',
        paste: 'Incolla diapositive',
        pasteEmpty: 'Copia prima una diapositiva in Obsidian.',
        pasteDestination:
            'Il tema di questa presentazione non corrisponde a queste diapositive. Copiale e incollale nell’app MarkdownPoint.',
        pasteVault: 'Queste diapositive provengono da un altro vault. Copiale e incollale nell’app MarkdownPoint.',
        pasteArtwork: 'La grafica del tema è diversa tra queste presentazioni. Copia e incolla le diapositive nell’app MarkdownPoint.',
        pasteChanged: 'La presentazione è stata modificata e le diapositive non sono state incollate. Riprova.',
        pasteFailed: 'Impossibile incollare le diapositive.',
        copyFailed: 'Impossibile copiare le diapositive.',
        copyUnavailable: 'Impossibile leggere la presentazione o i file del suo tema.',
        copyChanged: 'La presentazione è stata modificata e le diapositive non sono state copiate. Riprova.',
        copyNewer:
            'Questa presentazione usa un formato MarkdownPoint più recente. Aggiorna il plugin MarkdownPoint per copiarne o tagliarne le diapositive.',
        delete: ({ count }: { count: number }) => (count === 1 ? 'Elimina diapositiva' : 'Elimina diapositive'),
        deleteFailed: 'Impossibile eliminare le diapositive.',
        recoveryUnavailable: 'Impossibile leggere le copie di recupero su questo dispositivo.',
        saveFailed: 'Impossibile salvare i dati della presentazione. Su questo dispositivo è conservata una copia di recupero.',
        retry: 'Riprova',
        empty: 'Nessuna diapositiva'
    },
    commands: {
        newPresentation: 'Nuova presentazione',
        openInMarkdownPoint: 'Apri in MarkdownPoint',
        newSlide: 'Nuova diapositiva',
        focusOutline: 'Stato attivo su struttura',
        focusEditor: 'Stato attivo su editor',
        moveSlidesUp: 'Sposta diapositive su',
        moveSlidesDown: 'Sposta diapositive giù'
    },
    whatsNew: {
        title: 'Novità di MarkdownPoint',
        version: ({ version }: { version: string }) => `Versione ${version}`,
        new: 'Novità',
        improved: 'Migliorato',
        changed: 'Modificato',
        fixed: 'Corretto',
        close: 'Chiudi',
        section: 'Note di rilascio',
        setting: ({ version }: { version: string }) => `Novità di MarkdownPoint ${version}`,
        settingDescription: 'Cosa è cambiato nelle versioni più recenti.',
        view: 'Vedi aggiornamenti recenti',
        showOnUpdate: 'Mostra le novità dopo un aggiornamento',
        showOnUpdateDescription: 'Apre la finestra delle novità una volta dopo ogni aggiornamento.'
    }
};
