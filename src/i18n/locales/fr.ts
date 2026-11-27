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
    sidebarDescription: 'La barre latérale qui affiche le plan. Si vous utilisez Notebook Navigator, placez le plan à droite.',
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
        show: 'Afficher les images',
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
        exists: 'Un fichier ou un dossier portant ce nom existe déjà. Saisissez un autre nom.',
        insidePresentation: ({ presentation }: { presentation: string }) =>
            `MarkdownPoint ne peut pas créer de présentation dans «\u00a0${presentation}\u00a0». Choisissez un dossier hors de «\u00a0${presentation}\u00a0».`,
        nested: ({ presentation, outer }: { presentation: string; outer: string }) =>
            `MarkdownPoint ne peut pas ouvrir la présentation «\u00a0${presentation}\u00a0» tant qu’elle se trouve dans «\u00a0${outer}\u00a0». Déplacez le dossier «\u00a0${presentation}\u00a0» hors de «\u00a0${outer}\u00a0», puis ouvrez-le.`,
        failed: 'Impossible de créer la présentation. Réessayez.',
        openFailed: 'MarkdownPoint a créé la présentation, mais n’a pas pu l’ouvrir. Ouvrez slides.md dans son dossier.',
        openChanged: 'La présentation a changé avant que MarkdownPoint puisse l’ouvrir. Réessayez.',
        handoffFailed: 'Impossible d’enregistrer et d’ouvrir la présentation.',
        themeChanged:
            'Impossible de créer une présentation à partir du thème choisi. Rouvrez cette fenêtre et choisissez de nouveau le thème.',
        newerFormat: ({ version }: { version: string }) =>
            `Cette présentation utilise un format MarkdownPoint plus récent, la version ${version}. Mettez le module MarkdownPoint à jour pour l’ouvrir en tant que présentation.`,
        unreadableFile: ({ file, presentation }: { file: string; presentation: string }) =>
            `MarkdownPoint ne peut pas lire «\u00a0${file}\u00a0» dans «\u00a0${presentation}\u00a0». Ouvrez la présentation dans l’app MarkdownPoint pour voir ce qu’il faut corriger.`,
        unreadable: ({ presentation }: { presentation: string }) =>
            `MarkdownPoint ne peut pas lire la présentation dans «\u00a0${presentation}\u00a0». Ouvrez-la dans l’app MarkdownPoint pour voir ce qu’il faut corriger.`
    },
    slides: {
        new: 'Ajouter une diapositive',
        shortcut: 'Raccourci',
        noShortcut: 'Aucun',
        shortcutHint:
            'Appuyez sur le raccourci d’une disposition pour la choisir. Cliquez avec le bouton droit sur une disposition pour lui attribuer un raccourci.',
        shortcutFailed: 'Impossible d’enregistrer le raccourci.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}, raccourci ${digit}` : name),
        layoutsUnavailable: 'Aucune disposition n’est disponible dans cette présentation.',
        layoutChanged: 'La disposition a changé avant que MarkdownPoint puisse ajouter la diapositive. Réessayez.',
        newFailed: 'La présentation a changé avant que MarkdownPoint puisse ajouter la diapositive. Réessayez.',
        actions: 'Actions de la diapositive',
        copy: 'Copier la diapositive',
        cut: 'Couper la diapositive',
        cutChanged:
            'La présentation a changé avant que MarkdownPoint puisse couper les diapositives. Elles sont dans le presse-papiers et restent dans la présentation.',
        cutFailed: 'Impossible de couper les diapositives. Elles sont dans le presse-papiers et restent dans la présentation.',
        paste: 'Coller la diapositive',
        pasteEmpty: 'Copiez d’abord une diapositive dans Obsidian.',
        pasteDestination:
            'Le thème de cette présentation ne correspond pas à ces diapositives. Copiez-les et collez-les dans l’app MarkdownPoint.',
        pasteVault: 'Ces diapositives viennent d’un autre coffre. Copiez-les et collez-les dans l’app MarkdownPoint.',
        pasteArtwork:
            'Les thèmes des deux présentations ont des illustrations différentes. Copiez et collez les diapositives dans l’app MarkdownPoint.',
        pasteChanged: 'La présentation a changé avant que MarkdownPoint puisse coller les diapositives. Réessayez.',
        pasteFailed: 'Impossible de coller les diapositives.',
        copyFailed: 'Impossible de copier les diapositives.',
        copyUnavailable: 'Impossible de lire la présentation ou les fichiers de son thème.',
        copyChanged: 'La présentation a changé avant que MarkdownPoint puisse copier les diapositives. Réessayez.',
        copyNewer:
            'Cette présentation utilise un format MarkdownPoint plus récent. Mettez le module MarkdownPoint à jour pour copier ou couper ses diapositives.',
        delete: 'Supprimer la diapositive',
        deleteFailed: 'Impossible de supprimer les diapositives.',
        recoveryUnavailable: 'Impossible de lire les copies de récupération sur cet appareil.',
        saveFailed: 'Impossible d’enregistrer les données de la présentation.',
        retry: 'Réessayer',
        empty: 'Aucune diapositive'
    },
    commands: {
        newPresentation: 'Nouvelle présentation',
        openInMarkdownPoint: 'Ouvrir dans MarkdownPoint',
        newSlide: 'Ajouter une diapositive',
        focusOutline: 'Focus sur le plan',
        focusEditor: 'Focus sur l’éditeur',
        moveSlidesUp: 'Déplacer la diapositive vers le haut',
        moveSlidesDown: 'Déplacer la diapositive vers le bas'
    },
    whatsNew: {
        title: 'Nouveautés de MarkdownPoint',
        version: ({ version }: { version: string }) => `Version ${version}`,
        new: 'Nouveau',
        improved: 'Amélioré',
        changed: 'Modifié',
        fixed: 'Corrigé',
        close: 'Fermer',
        section: 'Notes de version',
        setting: ({ version }: { version: string }) => `Nouveautés de MarkdownPoint ${version}`,
        settingDescription: 'Voir ce qui a changé dans les versions récentes.',
        view: 'Voir les notes de version',
        showOnUpdate: 'Afficher les notes de version après une mise à jour'
    }
};
