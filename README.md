# MarkdownPoint for Obsidian

An Obsidian plugin for writing and organizing MarkdownPoint presentations, with visual finishing in the MarkdownPoint desktop app.

The intended workflow is to choose a theme, write in a focused Markdown editor with clear slide boundaries, add and rearrange slides, and continue in the MarkdownPoint desktop app for visual finishing. Both apps should work on the same presentation folder.

## Project status

This early development version recognizes `slides.md` beside `presentation.mdpoint` when both declare format version 1 and the same presentation identity. It provides a document-derived outline, slide navigation, sidebar placement, declarative settings, and focus commands. The outline updates while typing and after external file changes. It keeps following the most recent presentation when an ordinary note becomes active. Section names appear as unnumbered headings. Skipped slides stay visible with a dash, and slide numbering continues across sections.

Outline labels prefer a populated Title field, then fall back to the first other authored text. Speaker notes and placeholder words do not supply slide titles. The active outline row follows the editor's writing position in Live Preview and Source mode.

Click a row to select and navigate to that slide. Cmd-click on macOS or Ctrl-click on Windows toggles individual slides; Shift-click and Shift+Up/Down extend the selection using MDP's selection rules. Home and End navigate, with Shift extending the range. Cmd/Ctrl+A selects all slides while the outline has focus. Moving the editor caret or editing words preserves the selected group. The current writing slide has a stronger title; selected slides have a muted fill.

Writing remains in Obsidian's native Markdown editor. Live Preview shows numbered slide boundaries and protects their markers from ordinary typing, deletion, and movement. Title, Body, and Eyebrow fields show faint placeholders when empty and small headers when populated. Speaker notes open through a full-width disclosure beneath each slide, with a faint Notes placeholder when empty. Disclosure state is local to the device and vault. Placeholder words never become saved content. Source mode keeps raw Markdown editable. Names for other field roles, layout thumbnails, and structural slide operations are still in development. Other presentation data filenames are not currently supported.

Live Preview follows MDP's blank-line rule: one terminal blank line separates fields; additional blank lines remain authored space. Leading and interior empty paragraphs stay intact.

Outside code contributions and pull requests are not accepted. See the [contribution policy](CONTRIBUTING.md).

## Development

Requires Node.js 24 or later. The plugin requires Obsidian 1.13.0 or later and uses the declarative settings API.

```sh
npm ci
npm run check
```

Individual commands are `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. `npm run dev` watches the source. The build writes `main.js` locally; it does not install or deploy the plugin.

The settings page offers Sidebar with Left and Right options, defaulting to Right. This choice is local to the current device and vault. Use Obsidian's sidebar commands to control visibility. Focus outline reveals the outline; Focus editor returns to the followed presentation's editor, or the most recent Markdown editor before a presentation is followed.

Interface wording lives in `src/i18n/locales/en.ts`. Other locales use the same typed catalog; unsupported Obsidian languages fall back to English. English is the only bundled language currently.

Use a dedicated test vault and isolated profile for live development.

## License

GNU General Public License version 3; see [LICENSE](LICENSE). The license permits personal and commercial use, modification, and redistribution under its terms. The contribution policy does not restrict those rights.

Dependency license notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and included in the built plugin.
