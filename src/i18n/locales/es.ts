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

export const es: Translations = {
    name: 'MarkdownPoint',
    outline: 'Esquema',
    sidebar: 'Barra lateral',
    sidebarDescription: 'La barra lateral que muestra el esquema. Si usas Notebook Navigator, pon el esquema a la derecha.',
    left: 'Izquierda',
    right: 'Derecha',
    emptySlide: 'Diapositiva sin título',
    fields: {
        text: 'Texto',
        numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
        names: {
            title: 'Título',
            body: 'Cuerpo',
            eyebrow: 'Antetítulo',
            heading: 'Encabezado',
            subtitle: 'Subtítulo',
            caption: 'Pie de foto',
            quote: 'Cita',
            attribution: 'Atribución',
            code: 'Código',
            label: 'Etiqueta',
            footer: 'Pie de página',
            number: 'Número'
        }
    },
    images: {
        show: 'Mostrar imágenes',
        description: 'Muestra hasta cinco imágenes bajo la miniatura de cada diapositiva en el editor.',
        preview: 'Imagen de la diapositiva'
    },
    notes: { label: 'Notas del presentador', placeholder: 'Notas' },
    clipboard: { copyText: 'Copiar', copyFailed: 'No se pudo copiar el texto.' },
    presentations: {
        new: 'Nueva presentación',
        name: 'Nombre',
        folder: 'Carpeta',
        theme: 'Tema',
        included: 'Incluido',
        root: 'Carpeta de la bóveda',
        untitled: 'Presentación sin título',
        create: 'Crear',
        creating: 'Creando…',
        cancel: 'Cancelar',
        invalidName: 'Escribe un nombre sin barras ni caracteres reservados.',
        exists: 'Ya existe un archivo o una carpeta con este nombre. Escribe otro nombre.',
        insidePresentation: ({ presentation }: { presentation: string }) =>
            `MarkdownPoint no puede crear una presentación dentro de “${presentation}”. Elige una carpeta fuera de “${presentation}”.`,
        nested: ({ presentation, outer }: { presentation: string; outer: string }) =>
            `MarkdownPoint no puede abrir “${presentation}” mientras está dentro de “${outer}”. Saca la carpeta “${presentation}” de “${outer}” y después ábrela.`,
        failed: 'No se pudo crear la presentación. Inténtalo de nuevo.',
        openFailed: 'MarkdownPoint creó la presentación, pero no pudo abrirla. Abre slides.md en su carpeta.',
        openChanged: 'La presentación cambió antes de que MarkdownPoint pudiera abrirla. Inténtalo de nuevo.',
        handoffFailed: 'No se pudo guardar y abrir la presentación.',
        themeChanged:
            'No se pudo crear una presentación a partir del tema elegido. Vuelve a abrir este cuadro de diálogo y elige el tema de nuevo.',
        newerFormat: ({ version }: { version: string }) =>
            `Esta presentación usa un formato de MarkdownPoint más reciente, la versión ${version}. Actualiza el plugin MarkdownPoint para abrirla como presentación.`,
        unreadableFile: ({ file, presentation }: { file: string; presentation: string }) =>
            `MarkdownPoint no puede leer “${file}” en “${presentation}”. Abre la presentación en la app MarkdownPoint para ver qué hay que corregir.`,
        unreadable: ({ presentation }: { presentation: string }) =>
            `MarkdownPoint no puede leer la presentación de “${presentation}”. Ábrela en la app MarkdownPoint para ver qué hay que corregir.`
    },
    slides: {
        new: 'Añadir diapositiva',
        shortcut: 'Atajo',
        noShortcut: 'Ninguno',
        shortcutHint: 'Pulsa el atajo de una disposición para elegirla. Haz clic derecho en una disposición para asignarle un atajo.',
        shortcutFailed: 'No se pudo guardar el atajo.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}, atajo ${digit}` : name),
        layoutsUnavailable: 'No hay disposiciones disponibles en esta presentación.',
        layoutChanged: 'La disposición cambió antes de que MarkdownPoint pudiera añadir la diapositiva. Inténtalo de nuevo.',
        newFailed: 'La presentación cambió antes de que MarkdownPoint pudiera añadir la diapositiva. Inténtalo de nuevo.',
        actions: 'Acciones de diapositiva',
        copy: 'Copiar diapositiva',
        cut: 'Cortar diapositiva',
        cutChanged:
            'La presentación cambió antes de que MarkdownPoint pudiera cortar las diapositivas. Están en el portapapeles y siguen en la presentación.',
        cutFailed: 'No se pudieron cortar las diapositivas. Están en el portapapeles y siguen en la presentación.',
        paste: 'Pegar diapositiva',
        pasteEmpty: 'Copia primero una diapositiva en Obsidian.',
        pasteDestination: 'El tema de esta presentación no coincide con estas diapositivas. Cópialas y pégalas en la app MarkdownPoint.',
        pasteVault: 'Estas diapositivas son de otra bóveda. Cópialas y pégalas en la app MarkdownPoint.',
        pasteArtwork:
            'Los temas de las dos presentaciones tienen ilustraciones distintas. Copia y pega las diapositivas en la app MarkdownPoint.',
        pasteChanged: 'La presentación cambió antes de que MarkdownPoint pudiera pegar las diapositivas. Inténtalo de nuevo.',
        pasteFailed: 'No se pudieron pegar las diapositivas.',
        copyFailed: 'No se pudieron copiar las diapositivas.',
        copyUnavailable: 'No se pudo leer la presentación ni los archivos de su tema.',
        copyChanged: 'La presentación cambió antes de que MarkdownPoint pudiera copiar las diapositivas. Inténtalo de nuevo.',
        copyNewer:
            'Esta presentación usa un formato de MarkdownPoint más reciente. Actualiza el plugin MarkdownPoint para copiar o cortar sus diapositivas.',
        delete: 'Eliminar diapositiva',
        deleteFailed: 'No se pudieron eliminar las diapositivas.',
        recoveryUnavailable: 'No se pudieron leer las copias de recuperación de este dispositivo.',
        saveFailed: 'No se pudieron guardar los datos de la presentación.',
        retry: 'Reintentar',
        empty: 'No hay diapositivas'
    },
    commands: {
        newPresentation: 'Nueva presentación',
        openInMarkdownPoint: 'Abrir en MarkdownPoint',
        newSlide: 'Añadir diapositiva',
        focusOutline: 'Fijar el foco en el esquema',
        focusEditor: 'Fijar el foco en el editor',
        moveSlidesUp: 'Subir diapositiva',
        moveSlidesDown: 'Bajar diapositiva'
    },
    whatsNew: {
        title: 'Novedades de MarkdownPoint',
        version: ({ version }: { version: string }) => `Versión ${version}`,
        new: 'Nuevo',
        improved: 'Mejorado',
        changed: 'Cambiado',
        fixed: 'Corregido',
        close: 'Cerrar',
        section: 'Notas de la versión',
        setting: ({ version }: { version: string }) => `Novedades de MarkdownPoint ${version}`,
        settingDescription: 'Consulta qué ha cambiado en las versiones recientes.',
        view: 'Ver las notas de la versión',
        showOnUpdate: 'Mostrar las notas de la versión tras una actualización'
    }
};
