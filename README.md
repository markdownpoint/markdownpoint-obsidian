# MarkdownPoint for Obsidian

An Obsidian plugin for writing and organizing MarkdownPoint presentations, with visual finishing in the MarkdownPoint desktop app.

The intended workflow is to choose a theme, write in a focused Markdown editor with clear slide boundaries, add and rearrange slides, and continue in the MarkdownPoint desktop app for visual finishing. Both apps should work on the same presentation folder.

## Project status

This early development version recognizes `slides.md` beside `presentation.mdpoint` when both declare format version 1 and the same presentation identity. It provides a document-derived outline, slide navigation, sidebar placement, declarative settings, and focus commands. The outline updates while typing and after external file changes. It keeps following the most recent presentation when an ordinary note becomes active. Section names appear as unnumbered headings. Skipped slides stay visible with a dash, and slide numbering continues across sections.

Outline labels prefer a populated Title field, then fall back to the first other authored text. Speaker notes and placeholder words do not supply slide titles. The active outline row follows the editor's writing position in Live Preview and Source mode.

Click a row to select and navigate to that slide. Cmd-click on macOS or Ctrl-click on Windows toggles individual slides; Shift-click and Shift+Up/Down extend the selection using MDP's selection rules. Home and End navigate, with Shift extending the range. Cmd/Ctrl+A selects all slides while the outline has focus. Moving the editor caret or editing words preserves the selected group. The current writing slide has a stronger title; selected slides have a muted fill.

Use Cmd+Up/Down on macOS or Ctrl+Up/Down on Windows while the outline has focus to rearrange selected slides. A move keeps each slide's text fields, notes, and identity together. Crossing a section heading takes one step; multiple selections keep their gaps. Each step is one native undo event. Cmd/Ctrl+Z works from the outline, with Cmd+Shift+Z on macOS or Ctrl+Y/Ctrl+Shift+Z on Windows for redo. The writing caret stays with its text. Actions from Reading view enter the native editor, retaining the choice of Live Preview or Source mode and its undo history.

The **Move slides up** and **Move slides down** commands are available from the outline through the command palette. Assign your own shortcuts in Obsidian's Hotkeys settings; these commands have no default global hotkeys and are inactive while editing text or when the sidebar is collapsed.

Drag a selected row to move the selected group. A thin insertion line shows the destination before or after a slide; dropping on a section heading places the group at that section's start. A drop gathers the selected slides in their existing order and is one undoable action. Release outside the outline or press Escape to cancel.

Right-click an outline row and choose **Delete slide**, or **Delete slides** for a selected group. Shift+F10 or the context-menu key opens the same menu. Opening it keeps a selected group and preserves the writing position. Deletion is one native undo event; empty sections remain. Undo also restores the slide's companion data after closing and reopening the tab. Recovery records stay on this device, and a failed companion save offers **Retry**.

An empty Live Preview draft shows **No slides** and protects its hidden presentation metadata. Source mode remains editable.

Writing remains in Obsidian's native Markdown editor. Live Preview shows numbered slide boundaries and protects their markers from ordinary typing, deletion, and movement. Writing areas show faint placeholders when empty and small headers when populated. Labels use the text binding's readable name, including numbered fields such as Body 2 and custom names. Generated identity suffixes stay hidden; an unnamed text object shows Text. Composition text inputs use their control name. Each area retains its original binding and position in the Markdown. Speaker notes open through a full-width disclosure beneath each slide, with a faint Notes placeholder when empty. Disclosure state is local to the device and vault. Placeholder words never become saved content. Source mode keeps raw Markdown editable. Layout thumbnails, slide creation, and slide clipboard operations are still in development. Other presentation data filenames are not currently supported.

Live Preview follows MDP's blank-line rule: one terminal blank line separates fields; additional blank lines remain authored space. Leading and interior empty paragraphs stay intact.

Outside code contributions and pull requests are not accepted. See the [contribution policy](CONTRIBUTING.md).

## Development

Requires Node.js 24 or later. The plugin requires Obsidian 1.13.0 or later and uses the declarative settings API.

```sh
npm ci
npm run check
```

Individual commands are `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. `npm run dev` watches the source. The build writes `main.js` locally; it does not install or deploy the plugin.

The settings page offers Sidebar with Left and Right options, defaulting to Right. This choice is local to the current device and vault. Use Obsidian's sidebar commands to control visibility. Focus outline reveals the outline; Focus editor returns to the followed presentation's editor, or the most recent Markdown editor before a presentation is followed. Focus editor switches from Reading view to the previous editing mode when needed.

Interface wording lives in `src/i18n/locales/en.ts`. Other locales use the same typed catalog; unsupported Obsidian languages fall back to English. English is the only bundled language currently.

Use a dedicated test vault and isolated profile for live development.

## License

GNU General Public License version 3; see [LICENSE](LICENSE). The license permits personal and commercial use, modification, and redistribution under its terms. The contribution policy does not restrict those rights.

Dependency license notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and included in the built plugin.
