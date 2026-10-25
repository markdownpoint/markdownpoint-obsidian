# Building MarkdownPoint

Use Node.js 24 or newer.

```sh
npm ci
npm run check
```

`check` runs ESLint, TypeScript, behavioral tests and the production build. Run the individual steps with `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`. `npm run dev` rebuilds when source files change.

The build produces `main.js` in the repository root. It does not install the plugin or modify a vault. The runtime files are `main.js`, `manifest.json` and `styles.css`. Test them in a dedicated vault under `.obsidian/plugins/markdownpoint/`.

The plugin requires Obsidian 1.13.0 or newer. Its entry point is `src/main.ts`; file-format operations, native editor decorations, the outline and persistence have separate owners. Interface wording comes from the typed catalog in `src/i18n/locales/`. Static styling lives in `styles.css`.

Use synthetic presentations and a dedicated vault for testing. Format tests do not replace checks of cursor movement, selection, native undo, file reloads and editing the same presentation in MarkdownPoint.

See [LICENSE](../LICENSE), [third-party notices](../THIRD_PARTY_NOTICES.md) and the [contribution policy](../CONTRIBUTING.md) for their respective terms.
