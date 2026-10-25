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
  emptySlide: "Untitled slide",
  fields: {
    text: "Text",
    numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
    names: {
      title: "Title", body: "Body", eyebrow: "Eyebrow", heading: "Heading", subtitle: "Subtitle",
      caption: "Caption", quote: "Quote", attribution: "Attribution", code: "Code", label: "Label",
      footer: "Footer", number: "Number",
    },
  },
  images: { show: "Show slide images", description: "Show up to five images below each slide’s thumbnail in the editor.", preview: "Slide image" },
  notes: { label: "Presenter notes", placeholder: "Notes" },
  clipboard: { copyText: "Copy", copyFailed: "Couldn’t copy the text." },
  presentations: {
    new: "New presentation", name: "Name", folder: "Folder", theme: "Theme", included: "Included", root: "Vault folder",
    untitled: "Untitled presentation", create: "Create", creating: "Creating…", cancel: "Cancel",
    invalidName: "Enter a name without slashes or reserved characters.",
    exists: "A file or folder with this name already exists.",
    failed: "Couldn’t create the presentation. Check the folder and try again.",
    openFailed: "The presentation was created but couldn’t be opened. Open slides.md in its folder.",
    openChanged: "The presentation changed or couldn’t be read. Try again.",
    handoffFailed: "Couldn’t save and open the presentation.",
    themeChanged: "The theme changed or is unavailable. Reopen this dialog and choose it again.",
  },
  slides: {
    new: "New slide",
    shortcut: "Shortcut",
    noShortcut: "None",
    shortcutHint: "Press a layout’s number to use it. Right-click a layout to assign a shortcut.",
    shortcutFailed: "Couldn’t save the shortcut.",
    layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => digit ? `${name}, shortcut ${digit}` : name,
    layoutsUnavailable: "No layouts are available in this presentation.",
    layoutChanged: "The layout changed. Choose it again.",
    newFailed: "The presentation changed before the slide could be added. Try again.",
    actions: "Slide actions",
    copy: ({ count }: { count: number }): string => count === 1 ? "Copy slide" : "Copy slides",
    cut: ({ count }: { count: number }): string => count === 1 ? "Cut slide" : "Cut slides",
    cutChanged: "The presentation changed before the slides could be cut. They were only copied.",
    cutFailed: "Couldn’t cut the slides. They were only copied.",
    paste: "Paste slides",
    pasteEmpty: "Copy a slide in Obsidian first.",
    pasteDestination: "This presentation’s theme doesn’t match these slides. Copy and paste them in the MarkdownPoint app.",
    pasteVault: "These slides are from another vault. Copy and paste them in the MarkdownPoint app.",
    pasteArtwork: "The theme artwork differs between these presentations. Copy and paste the slides in the MarkdownPoint app.",
    pasteChanged: "The presentation changed before the slides could be pasted. Try again.",
    pasteFailed: "Couldn’t paste the slides.",
    copyFailed: "Couldn’t copy the slides.",
    copyUnavailable: "Couldn’t read the presentation or its theme files.",
    copyChanged: "The presentation changed before the slides could be copied. Try again.",
    delete: ({ count }: { count: number }): string => count === 1 ? "Delete slide" : "Delete slides",
    deleteFailed: "Couldn’t delete the slides.",
    recoveryUnavailable: "Couldn’t read the recovery copies on this device.",
    saveFailed: "Couldn’t save the presentation data. A recovery copy is kept on this device.",
    retry: "Retry",
    empty: "No slides",
  },
  commands: {
    newPresentation: "New presentation",
    openInMarkdownPoint: "Open in MarkdownPoint",
    newSlide: "New slide",
    focusOutline: "Focus outline",
    focusEditor: "Focus editor",
    moveSlidesUp: "Move slides up",
    moveSlidesDown: "Move slides down",
  },
};
