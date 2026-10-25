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

export const es: Translations = {
  name: "MarkdownPoint",
  outline: "Esquema",
  sidebar: "Barra lateral",
  left: "Izquierda",
  right: "Derecha",
  emptySlide: "Diapositiva sin título",
  fields: {
    text: "Texto",
    numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
    names: {
      title: "Título", body: "Cuerpo", eyebrow: "Antetítulo", heading: "Encabezado", subtitle: "Subtítulo",
      caption: "Pie de foto", quote: "Cita", attribution: "Atribución", code: "Código", label: "Etiqueta",
      footer: "Pie de página", number: "Número",
    },
  },
  images: { show: "Mostrar imágenes de diapositivas", description: "Muestra hasta cinco imágenes bajo la miniatura de cada diapositiva en el editor.", preview: "Imagen de la diapositiva" },
  notes: { label: "Notas del presentador", placeholder: "Notas" },
  clipboard: { copyText: "Copiar", copyFailed: "No se pudo copiar el texto." },
  presentations: {
    new: "Nueva presentación", name: "Nombre", folder: "Carpeta", theme: "Tema", included: "Incluido", root: "Carpeta de la bóveda",
    untitled: "Presentación sin título", create: "Crear", creating: "Creando…", cancel: "Cancelar",
    invalidName: "Escribe un nombre sin barras ni caracteres reservados.",
    exists: "Ya existe un archivo o una carpeta con este nombre.",
    failed: "No se pudo crear la presentación. Verifica la carpeta e inténtalo de nuevo.",
    openFailed: "La presentación se creó, pero no se pudo abrir. Abre slides.md en su carpeta.",
    openChanged: "La presentación cambió o no se pudo leer. Inténtalo de nuevo.",
    handoffFailed: "No se pudo guardar y abrir la presentación.",
    themeChanged: "El tema cambió o no está disponible. Vuelve a abrir este cuadro de diálogo y elígelo de nuevo.",
  },
  slides: {
    new: "Nueva diapositiva",
    shortcut: "Atajo",
    noShortcut: "Ninguno",
    shortcutHint: "Presiona el número de una disposición para usarla. Haz clic derecho en una disposición para asignarle un atajo.",
    shortcutFailed: "No se pudo guardar el atajo.",
    layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => digit ? `${name}, atajo ${digit}` : name,
    layoutsUnavailable: "No hay disposiciones disponibles en esta presentación.",
    layoutChanged: "La disposición cambió. Elígela de nuevo.",
    newFailed: "La presentación cambió antes de poder añadir la diapositiva. Inténtalo de nuevo.",
    actions: "Acciones de diapositiva",
    copy: ({ count }: { count: number }) => count === 1 ? "Copiar diapositiva" : "Copiar diapositivas",
    cut: ({ count }: { count: number }) => count === 1 ? "Cortar diapositiva" : "Cortar diapositivas",
    cutChanged: "La presentación cambió antes de poder cortar las diapositivas. Solo se copiaron.",
    cutFailed: "No se pudieron cortar las diapositivas. Solo se copiaron.",
    paste: "Pegar diapositivas",
    pasteEmpty: "Copia primero una diapositiva en Obsidian.",
    pasteDestination: "El tema de esta presentación no coincide con estas diapositivas. Cópialas y pégalas en la app MarkdownPoint.",
    pasteVault: "Estas diapositivas son de otra bóveda. Cópialas y pégalas en la app MarkdownPoint.",
    pasteArtwork: "Las ilustraciones del tema difieren entre estas presentaciones. Copia y pega las diapositivas en la app MarkdownPoint.",
    pasteChanged: "La presentación cambió antes de poder pegar las diapositivas. Inténtalo de nuevo.",
    pasteFailed: "No se pudieron pegar las diapositivas.",
    copyFailed: "No se pudieron copiar las diapositivas.",
    copyUnavailable: "No se pudo leer la presentación ni los archivos de su tema.",
    copyChanged: "La presentación cambió antes de poder copiar las diapositivas. Inténtalo de nuevo.",
    delete: ({ count }: { count: number }) => count === 1 ? "Eliminar diapositiva" : "Eliminar diapositivas",
    deleteFailed: "No se pudieron eliminar las diapositivas.",
    recoveryUnavailable: "No se pudieron leer las copias de recuperación de este dispositivo.",
    saveFailed: "No se pudieron guardar los datos de la presentación. Se conserva una copia de recuperación en este dispositivo.",
    retry: "Reintentar",
    empty: "No hay diapositivas",
  },
  commands: {
    newPresentation: "Nueva presentación",
    openInMarkdownPoint: "Abrir en MarkdownPoint",
    newSlide: "Nueva diapositiva",
    focusOutline: "Fijar el foco en el esquema",
    focusEditor: "Fijar el foco en el editor",
    moveSlidesUp: "Subir diapositivas",
    moveSlidesDown: "Bajar diapositivas",
  },
};
