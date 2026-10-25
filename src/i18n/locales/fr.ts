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

export const fr: Translations = {
    name: 'MarkdownPoint',
    outline: 'Plan',
    sidebar: 'Barre latérale',
    left: 'Gauche',
    right: 'Droite',
    emptySlide: 'Diapositive sans titre',
    fields: {
        text: 'Texte',
        numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
        names: {
            title: 'Titre',
            body: 'Corps',
            eyebrow: 'Surtitre',
            heading: 'En-tête',
            subtitle: 'Sous-titre',
            caption: 'Légende',
            quote: 'Citation',
            attribution: 'Attribution',
            code: 'Code',
            label: 'Étiquette',
            footer: 'Pied de page',
            number: 'Numéro'
        }
    },
    images: {
        show: 'Afficher les images des diapositives',
        description: 'Afficher jusqu’à cinq images sous la vignette de chaque diapositive dans l’éditeur.',
        preview: 'Image de la diapositive'
    },
    notes: { label: 'Notes de l’intervenant', placeholder: 'Notes' },
    clipboard: { copyText: 'Copier', copyFailed: 'Impossible de copier le texte.' },
    presentations: {
        new: 'Nouvelle présentation',
        name: 'Nom',
        folder: 'Dossier',
        theme: 'Thème',
        included: 'Inclus',
        root: 'Racine du coffre',
        untitled: 'Présentation sans titre',
        create: 'Créer',
        creating: 'Création…',
        cancel: 'Annuler',
        invalidName: 'Saisissez un nom sans barres obliques ni caractères réservés.',
        exists: 'Un fichier ou un dossier portant ce nom existe déjà.',
        failed: 'Impossible de créer la présentation. Vérifiez le dossier et réessayez.',
        openFailed: 'La présentation a été créée, mais n’a pas pu être ouverte. Ouvrez slides.md dans son dossier.',
        openChanged: 'La présentation a changé ou n’a pas pu être lue. Réessayez.',
        handoffFailed: 'Impossible d’enregistrer et d’ouvrir la présentation.',
        themeChanged: 'Le thème a changé ou n’est pas disponible. Rouvrez cette fenêtre et choisissez-le de nouveau.'
    },
    slides: {
        new: 'Nouvelle diapositive',
        shortcut: 'Raccourci',
        noShortcut: 'Aucun',
        shortcutHint:
            'Appuyez sur le numéro d’une disposition pour l’utiliser. Cliquez avec le bouton droit sur une disposition pour lui attribuer un raccourci.',
        shortcutFailed: 'Impossible d’enregistrer le raccourci.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}, raccourci ${digit}` : name),
        layoutsUnavailable: 'Aucune disposition n’est disponible dans cette présentation.',
        layoutChanged: 'La disposition a changé. Choisissez-la de nouveau.',
        newFailed: 'La présentation a changé avant que la diapositive puisse être ajoutée. Réessayez.',
        actions: 'Actions de la diapositive',
        copy: ({ count }: { count: number }) => (count === 1 ? 'Copier la diapositive' : 'Copier les diapositives'),
        cut: ({ count }: { count: number }) => (count === 1 ? 'Couper la diapositive' : 'Couper les diapositives'),
        cutChanged: 'La présentation a changé avant que les diapositives puissent être coupées. Elles ont seulement été copiées.',
        cutFailed: 'Impossible de couper les diapositives. Elles ont seulement été copiées.',
        paste: 'Coller les diapositives',
        pasteEmpty: 'Copiez d’abord une diapositive dans Obsidian.',
        pasteDestination:
            'Le thème de cette présentation ne correspond pas à ces diapositives. Copiez-les et collez-les dans l’app MarkdownPoint.',
        pasteVault: 'Ces diapositives viennent d’un autre coffre. Copiez-les et collez-les dans l’app MarkdownPoint.',
        pasteArtwork:
            'Les illustrations du thème diffèrent entre ces présentations. Copiez et collez les diapositives dans l’app MarkdownPoint.',
        pasteChanged: 'La présentation a changé avant que les diapositives puissent être collées. Réessayez.',
        pasteFailed: 'Impossible de coller les diapositives.',
        copyFailed: 'Impossible de copier les diapositives.',
        copyUnavailable: 'Impossible de lire la présentation ou les fichiers de son thème.',
        copyChanged: 'La présentation a changé avant que les diapositives puissent être copiées. Réessayez.',
        delete: ({ count }: { count: number }) => (count === 1 ? 'Supprimer la diapositive' : 'Supprimer les diapositives'),
        deleteFailed: 'Impossible de supprimer les diapositives.',
        recoveryUnavailable: 'Impossible de lire les copies de récupération sur cet appareil.',
        saveFailed: 'Impossible d’enregistrer les données de la présentation. Une copie de récupération est conservée sur cet appareil.',
        retry: 'Réessayer',
        empty: 'Aucune diapositive'
    },
    commands: {
        newPresentation: 'Nouvelle présentation',
        openInMarkdownPoint: 'Ouvrir dans MarkdownPoint',
        newSlide: 'Nouvelle diapositive',
        focusOutline: 'Focus sur le plan',
        focusEditor: 'Focus sur l’éditeur',
        moveSlidesUp: 'Déplacer les diapositives vers le haut',
        moveSlidesDown: 'Déplacer les diapositives vers le bas'
    }
};
