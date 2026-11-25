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

/*
 * What the What's new dialog shows, and which releases open it by themselves. The release
 * workflow publishes the same entry as the GitHub release notes.
 *
 * The version last shown is recorded after the dialog closes, so an upgrade shows every
 * release since that marker rather than only the newest one. A first run, a same-version
 * start and a downgrade never open it.
 *
 * Note text carries a small amount of inline formatting, rendered by the dialog:
 * **bold**, `code`, ==emphasis==, [label](https://example.com) and a bare link. A single
 * newline becomes a line break. Nothing else is interpreted.
 */

export interface ReleaseNote {
    version: string;
    /** ISO date, shown beside the version heading in the reader's own date format. */
    date: string;
    /** When false, updating to this release does not open the dialog by itself. */
    showOnUpdate?: boolean;
    /** Lead paragraph above the lists. */
    info?: string;
    new?: string[];
    improved?: string[];
    changed?: string[];
    fixed?: string[];
}

/** Newest first. A new release goes at the top. */
const RELEASE_NOTES: ReleaseNote[] = [
    {
        version: '1.0.3',
        date: '2026-11-24',
        changed: [
            'Skipped slides are numbered in the outline and on their dividers. Their numbers are in parentheses.',
            'The outline names slides and sections as the MarkdownPoint app does.'
        ],
        fixed: [
            'Outline labels such as `**Big *news*!** today` no longer show their asterisks. In Live Preview, bold and italic around a span match the MarkdownPoint app.',
            'A section name with a superscript or a subscript, such as `E = mc<sup>2</sup>`, appears in the outline.',
            'A line break ends a slide’s label in the outline.',
            'Live Preview hides every bold, italic, highlight, and strikethrough mark in a span such as `[**Mark *it*!**]{color=accent}`.',
            'When you paste slides that link to one another, links in a table of more than 25,000 cells point to the pasted slides.'
        ]
    },
    {
        version: '1.0.2',
        date: '2026-11-24',
        fixed: [
            'Themes whose text styles MarkdownPoint sets in italic or aligns now open in the plugin.',
            'Presentations with animation effects saved by MarkdownPoint 0.9.1 now open in the plugin.'
        ]
    },
    {
        version: '1.0.1',
        date: '2026-11-24',
        improved: [
            'Click a slide’s divider to start writing on that slide.',
            'Words you type on a slide with no text yet go into its first text area. When the layout has no text areas, they go into the slide’s presenter notes.',
            'In Live Preview, a link whose words contain a span opens with a click. A span looks like `[words]{color=accent}`.',
            'In Live Preview, bold, italic, and inline code appear formatted inside a span or a link’s words.'
        ],
        changed: [
            'MarkdownPoint’s file format changed before the app’s release. Presentations made with plugin 1.0.0 no longer open as presentations. Create them again with **New presentation**.',
            'The plugin can’t create or open a presentation inside another presentation’s folder.'
        ],
        fixed: [
            'Rotated objects in slide thumbnails turn about the same point as in the MarkdownPoint app. The images under a thumbnail show the background the slide has in the app.',
            'Numbers pasted into a chart’s table are written in the file’s number format.',
            'A saved version in a presentation’s `versions` folder no longer opens as a separate presentation.',
            'A code block with no closing fence keeps its blank lines.'
        ]
    },
    {
        version: '1.0.0',
        date: '2026-10-25',
        new: ['First release 🎉']
    }
];

const VERSION_PATTERN = /^\d+(\.\d+)*$/;

/**
 * Validates a stored version marker, returning '' for anything that is not a version.
 * A hand-edited or half-written data.json would otherwise either suppress the dialog for
 * good or reopen it on every start.
 */
export function normalizeVersion(value: unknown): string {
    if (typeof value !== 'string') return '';

    const trimmed = value.trim();
    return VERSION_PATTERN.test(trimmed) ? trimmed : '';
}

/** Orders two versions: 1 when `a` is newer, -1 when `b` is newer, 0 when they match. */
export function compareVersions(a: string, b: string): number {
    const left = a.split('.').map(Number);
    const right = b.split('.').map(Number);

    for (let index = 0; index < Math.max(left.length, right.length); index++) {
        // A missing or unparsable segment counts as 0, so "1.2" and "1.2.0" are equal
        const difference = (left[index] || 0) - (right[index] || 0);
        if (difference !== 0) return difference > 0 ? 1 : -1;
    }

    return 0;
}

/** The most recent releases, for the button in settings. */
export function getLatestReleaseNotes(count = 5): ReleaseNote[] {
    return RELEASE_NOTES.slice(0, count);
}

/** Every release after `fromVersion` and up to `toVersion`, newest first. */
function getReleaseNotesBetweenVersions(fromVersion: string, toVersion: string): ReleaseNote[] {
    return RELEASE_NOTES.filter(note => compareVersions(note.version, fromVersion) > 0 && compareVersions(note.version, toVersion) <= 0);
}

/**
 * The releases the upgrade dialog shows: everything after `fromVersion`, padded with the
 * releases below it so the dialog always holds a few for context. Releases above
 * `toVersion` stay hidden, because a note can sit in the code before its release ships.
 */
export function getReleaseNotesForUpdate(fromVersion: string, toVersion: string, minimum = 5): ReleaseNote[] {
    const released = RELEASE_NOTES.filter(note => compareVersions(note.version, toVersion) <= 0);
    const unseen = released.filter(note => compareVersions(note.version, fromVersion) > 0).length;
    return released.slice(0, Math.max(unseen, minimum));
}

/**
 * Whether an upgrade should open the dialog on its own.
 *
 * A release marked `showOnUpdate: false` is passed over silently, and because the marker
 * is only advanced once the dialog has actually been shown, its notes still appear later
 * alongside the next release that does open it.
 */
export function shouldAutoDisplayReleaseNotesForUpdate(fromVersion: string, toVersion: string): boolean {
    return getReleaseNotesBetweenVersions(fromVersion, toVersion).some(note => note.showOnUpdate !== false);
}
