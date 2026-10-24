# MarkdownPoint for Obsidian

An Obsidian plugin for writing and organizing MarkdownPoint presentations, with visual finishing in the MarkdownPoint desktop app.

The intended workflow is to choose a theme, write in a focused Markdown editor with clear slide boundaries, add and rearrange slides, and continue in the MarkdownPoint desktop app for visual finishing. Both apps should work on the same presentation folder.

## Project status

This repository currently contains an early plugin scaffold with sidebar placement, declarative settings, focus commands, and focused tests. Presentation discovery and editing are not connected yet. The scaffold does not currently recognize or modify presentation files.

Outside code contributions and pull requests are not accepted. See the [contribution policy](CONTRIBUTING.md).

## Development

Requires Node.js 24 or later. The plugin requires Obsidian 1.13.0 or later and uses the declarative settings API.

```sh
npm ci
npm run check
```

Individual commands are `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. `npm run dev` watches the source. The build writes `main.js` locally; it does not install or deploy the plugin.

The settings page offers Sidebar with Left and Right options, defaulting to Right. This choice is local to the current device and vault. Use Obsidian's sidebar commands to control visibility. Focus outline reveals the outline; Focus editor returns to the followed presentation's editor, or the most recent Markdown editor before a presentation is followed.

Use a dedicated test vault and isolated profile for live development. Real presentation loading and editing are not available in the scaffold yet.

## License

GNU General Public License version 3; see [LICENSE](LICENSE). The license permits personal and commercial use, modification, and redistribution under its terms. The contribution policy does not restrict those rights.
