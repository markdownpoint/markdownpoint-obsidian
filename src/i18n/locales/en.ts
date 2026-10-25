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

export const en = {
  name: "MarkdownPoint",
  outline: "Outline",
  sidebar: "Sidebar",
  left: "Left",
  right: "Right",
  emptySlide: "Title",
  fields: {
    text: "Text",
    numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
    names: {
      title: "Title", body: "Body", eyebrow: "Eyebrow", heading: "Heading", subtitle: "Subtitle",
      caption: "Caption", quote: "Quote", attribution: "Attribution", code: "Code", label: "Label",
      footer: "Footer", number: "Number",
    },
  },
  notes: { label: "Speaker notes", placeholder: "Notes" },
  clipboard: { copyText: "Copy", copyFailed: "Could not copy text to the clipboard." },
  slides: {
    copy: ({ count }: { count: number }) => count === 1 ? "Copy slide" : "Copy slides",
    copyFailed: "Could not copy slides to the clipboard.",
    copyUnavailable: "Could not read the presentation or its theme files.",
    copyChanged: "The presentation changed before it could be copied. Try again.",
    delete: ({ count }: { count: number }) => count === 1 ? "Delete slide" : "Delete slides",
    deleteFailed: "The slide could not be deleted.",
    recoveryUnavailable: "Could not open slide recovery data.",
    saveFailed: "Could not save slide data. A recovery copy is kept on this device.",
    retry: "Retry",
    empty: "No slides",
  },
  commands: {
    focusOutline: "Focus outline",
    focusEditor: "Focus editor",
    moveSlidesUp: "Move slides up",
    moveSlidesDown: "Move slides down",
  },
};
