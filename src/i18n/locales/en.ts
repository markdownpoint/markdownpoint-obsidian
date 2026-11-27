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
    name: 'MarkdownPoint',
    outline: 'Outline',
    sidebar: 'Sidebar',
    sidebarDescription: 'The sidebar that shows the outline. If you use Notebook Navigator, put the outline on the right.',
    left: 'Left',
    right: 'Right',
    emptySlide: 'Untitled slide',
    fields: {
        text: 'Text',
        numbered: ({ name, number }: { name: string; number: string }) => `${name} ${number}`,
        names: {
            title: 'Title',
            body: 'Body',
            eyebrow: 'Eyebrow',
            heading: 'Heading',
            subtitle: 'Subtitle',
            caption: 'Caption',
            quote: 'Quote',
            attribution: 'Attribution',
            code: 'Code',
            label: 'Label',
            footer: 'Footer',
            number: 'Number'
        }
    },
    images: {
        show: 'Show images',
        description: 'Show up to five images below each slide’s thumbnail in the editor.',
        preview: 'Slide image'
    },
    notes: { label: 'Presenter notes', placeholder: 'Notes' },
    clipboard: { copyText: 'Copy', copyFailed: 'Couldn’t copy the text.' },
    presentations: {
        new: 'New presentation',
        name: 'Name',
        folder: 'Folder',
        theme: 'Theme',
        included: 'Included',
        root: 'Vault folder',
        untitled: 'Untitled presentation',
        create: 'Create',
        creating: 'Creating…',
        cancel: 'Cancel',
        invalidName: 'Enter a name without slashes or reserved characters.',
        exists: 'A file or folder with this name already exists. Enter another name.',
        insidePresentation: ({ presentation }: { presentation: string }) =>
            `MarkdownPoint can’t create a presentation inside “${presentation}”. Choose a folder outside it.`,
        nested: ({ presentation, outer }: { presentation: string; outer: string }) =>
            `MarkdownPoint can’t open “${presentation}” while it is inside “${outer}”. Move the “${presentation}” folder out of “${outer}”, then open it.`,
        failed: 'Couldn’t create the presentation. Try again.',
        openFailed: 'MarkdownPoint created the presentation but couldn’t open it. Open slides.md in its folder.',
        openChanged: 'The presentation changed before MarkdownPoint could open it. Try again.',
        handoffFailed: 'Couldn’t save and open the presentation.',
        themeChanged: 'Couldn’t create a presentation from the chosen theme. Reopen this dialog and choose the theme again.',
        newerFormat: ({ version }: { version: string }) =>
            `This presentation uses a newer MarkdownPoint format, version ${version}. Update the MarkdownPoint plugin to open it as a presentation.`,
        unreadableFile: ({ file, presentation }: { file: string; presentation: string }) =>
            `MarkdownPoint can’t read “${file}” in “${presentation}”. Open the presentation in the MarkdownPoint app to see what to fix.`,
        unreadable: ({ presentation }: { presentation: string }) =>
            `MarkdownPoint can’t read the presentation in “${presentation}”. Open it in the MarkdownPoint app to see what to fix.`
    },
    slides: {
        new: 'Add slide',
        shortcut: 'Shortcut',
        noShortcut: 'None',
        shortcutHint: 'Press a layout’s shortcut to choose it. Right-click a layout to assign a shortcut.',
        shortcutFailed: 'Couldn’t save the shortcut.',
        layoutShortcutLabel: ({ name, digit }: { name: string; digit: string | null }) => (digit ? `${name}, shortcut ${digit}` : name),
        layoutsUnavailable: 'No layouts are available in this presentation.',
        layoutChanged: 'The layout changed before MarkdownPoint could add the slide. Try again.',
        newFailed: 'The presentation changed before MarkdownPoint could add the slide. Try again.',
        actions: 'Slide actions',
        copy: 'Copy slide',
        cut: 'Cut slide',
        cutChanged:
            'The presentation changed before MarkdownPoint could cut the slides. They’re on the clipboard and still in the presentation.',
        cutFailed: 'Couldn’t cut the slides. They’re on the clipboard and still in the presentation.',
        paste: 'Paste slide',
        pasteEmpty: 'Copy a slide in Obsidian first.',
        pasteDestination: 'This presentation’s theme doesn’t match these slides. Copy and paste them in the MarkdownPoint app.',
        pasteVault: 'These slides are from another vault. Copy and paste them in the MarkdownPoint app.',
        pasteArtwork: 'The two presentations’ themes have different artwork. Copy and paste the slides in the MarkdownPoint app.',
        pasteChanged: 'The presentation changed before MarkdownPoint could paste the slides. Try again.',
        pasteFailed: 'Couldn’t paste the slides.',
        copyFailed: 'Couldn’t copy the slides.',
        copyUnavailable: 'Couldn’t read the presentation or its theme files.',
        copyChanged: 'The presentation changed before MarkdownPoint could copy the slides. Try again.',
        copyNewer: 'This presentation uses a newer MarkdownPoint format. Update the MarkdownPoint plugin to copy or cut its slides.',
        delete: 'Delete slide',
        deleteFailed: 'Couldn’t delete the slides.',
        recoveryUnavailable: 'Couldn’t read the recovery copies on this device.',
        saveFailed: 'Couldn’t save the presentation data.',
        retry: 'Retry',
        empty: 'No slides'
    },
    commands: {
        newPresentation: 'New presentation',
        openInMarkdownPoint: 'Open in MarkdownPoint',
        newSlide: 'Add slide',
        focusOutline: 'Focus outline',
        focusEditor: 'Focus editor',
        moveSlidesUp: 'Move slide up',
        moveSlidesDown: 'Move slide down'
    },
    whatsNew: {
        title: 'What’s new in MarkdownPoint',
        version: ({ version }: { version: string }) => `Version ${version}`,
        new: 'New',
        improved: 'Improved',
        changed: 'Changed',
        fixed: 'Fixed',
        close: 'Close',
        section: 'Release notes',
        setting: ({ version }: { version: string }) => `What’s new in MarkdownPoint ${version}`,
        settingDescription: 'See what changed in recent releases.',
        view: 'View release notes',
        showOnUpdate: 'Show release notes after updating'
    }
};
