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
    sidebarDescription: 'La barra laterale che mostra la struttura. Se usi Notebook Navigator, metti la struttura a destra.',
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
        exists: 'Esiste già un file o una cartella con questo nome. Inserisci un altro nome.',
        insidePresentation: ({ presentation }: { presentation: string }) =>
            `MarkdownPoint non può creare una presentazione all’interno di “${presentation}”. Scegli una cartella fuori da “${presentation}”.`,
        nested: ({ presentation, outer }: { presentation: string; outer: string }) =>
            `MarkdownPoint non può aprire la presentazione “${presentation}” finché si trova all’interno di “${outer}”. Sposta la cartella “${presentation}” fuori da “${outer}”, poi aprila.`,
        failed: 'Impossibile creare la presentazione. Riprova.',
        openFailed: 'MarkdownPoint ha creato la presentazione, ma non è riuscito ad aprirla. Apri slides.md nella sua cartella.',
        openChanged: 'La presentazione è stata modificata prima che MarkdownPoint potesse aprirla. Riprova.',
        handoffFailed: 'Impossibile salvare e aprire la presentazione.',
        themeChanged: 'Impossibile creare una presentazione dal tema scelto. Riapri questa finestra e scegli di nuovo il tema.',
        newerFormat: ({ version }: { version: string }) =>
            `Questa presentazione usa un formato MarkdownPoint più recente, la versione ${version}. Aggiorna il plugin MarkdownPoint per aprirla come presentazione.`,
        unreadableFile: ({ file, presentation }: { file: string; presentation: string }) =>
            `MarkdownPoint non può leggere “${file}” in “${presentation}”. Apri la presentazione nell’app MarkdownPoint per vedere cosa correggere.`,
        unreadable: ({ presentation }: { presentation: string }) =>
            `MarkdownPoint non può leggere la presentazione in “${presentation}”. Aprila nell’app MarkdownPoint per vedere cosa correggere.`
    },
    slides: {
        new: 'Aggiungi diapositiva',
        shortcut: 'Scorciatoia',
        noShortcut: 'Nessuna',
        shortcutHint: 'Premi la scorciatoia di un layout per sceglierlo. Fai clic destro su un layout per assegnare una scorciatoia.',
        shortcutFailed: 'Impossibile salvare la scorciatoia.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}, scorciatoia ${digit}` : name),
        layoutsUnavailable: 'Nessun layout disponibile in questa presentazione.',
        layoutChanged: 'Il layout è stato modificato prima che MarkdownPoint potesse aggiungere la diapositiva. Riprova.',
        newFailed: 'La presentazione è stata modificata prima che MarkdownPoint potesse aggiungere la diapositiva. Riprova.',
        actions: 'Azioni diapositiva',
        copy: 'Copia diapositiva',
        cut: 'Taglia diapositiva',
        cutChanged:
            'La presentazione è stata modificata prima che MarkdownPoint potesse tagliare le diapositive. Le diapositive sono negli appunti e restano nella presentazione.',
        cutFailed: 'Impossibile tagliare le diapositive. Sono negli appunti e restano nella presentazione.',
        paste: 'Incolla diapositiva',
        pasteEmpty: 'Copia prima una diapositiva in Obsidian.',
        pasteDestination:
            'Il tema di questa presentazione non corrisponde a queste diapositive. Copiale e incollale nell’app MarkdownPoint.',
        pasteVault: 'Queste diapositive provengono da un altro vault. Copiale e incollale nell’app MarkdownPoint.',
        pasteArtwork: 'I temi delle due presentazioni hanno una grafica diversa. Copia e incolla le diapositive nell’app MarkdownPoint.',
        pasteChanged: 'La presentazione è stata modificata prima che MarkdownPoint potesse incollare le diapositive. Riprova.',
        pasteFailed: 'Impossibile incollare le diapositive.',
        copyFailed: 'Impossibile copiare le diapositive.',
        copyUnavailable: 'Impossibile leggere la presentazione o i file del suo tema.',
        copyChanged: 'La presentazione è stata modificata prima che MarkdownPoint potesse copiare le diapositive. Riprova.',
        copyNewer:
            'Questa presentazione usa un formato MarkdownPoint più recente. Aggiorna il plugin MarkdownPoint per copiarne o tagliarne le diapositive.',
        delete: 'Elimina diapositiva',
        deleteFailed: 'Impossibile eliminare le diapositive.',
        recoveryUnavailable: 'Impossibile leggere le copie di recupero su questo dispositivo.',
        saveFailed: 'Impossibile salvare i dati della presentazione.',
        retry: 'Riprova',
        empty: 'Nessuna diapositiva'
    },
    commands: {
        newPresentation: 'Nuova presentazione',
        openInMarkdownPoint: 'Apri in MarkdownPoint',
        newSlide: 'Aggiungi diapositiva',
        focusOutline: 'Stato attivo su struttura',
        focusEditor: 'Stato attivo su editor',
        moveSlidesUp: 'Sposta diapositiva su',
        moveSlidesDown: 'Sposta diapositiva giù'
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
        view: 'Vedi note di rilascio',
        showOnUpdate: 'Mostra le note di rilascio dopo un aggiornamento'
    }
};
