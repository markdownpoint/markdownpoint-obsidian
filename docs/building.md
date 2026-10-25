# Building MarkdownPoint

Use Node.js 24 or newer.

```sh
npm ci
npm run check
```

`check` runs `scripts/build.sh`, the full quality gate: ESLint, stylelint, markdownlint, TypeScript, the tests, a Prettier check and knip's dead-code check. It builds only when every step passes. Run single steps with `npm run lint`, `npm run lint:styles`, `npm run lint:docs`, `npm test` and `npm run build`; `npm run format` applies Prettier. `npm run dev` rebuilds when source files change.

The build produces `main.js` in the repository root. When the ignored `test-vault/.obsidian/plugins/markdownpoint/` folder exists, each local build also copies `main.js`, `manifest.json` and `styles.css` there; reload the plugin in the test vault to use it. CI builds never deploy.

GitHub Actions runs the same gate on macOS, Windows and Linux with Node.js 24. See [releasing](releasing.md) for publishing a version. Those checks cover the build and automated behavior; native editor and operating-system integrations also need live verification.

The plugin requires Obsidian 1.13.0 or newer. Its entry point is `src/main.ts`; file-format operations, native editor decorations, the outline and persistence have separate owners. Interface wording comes from the typed catalog in `src/i18n/locales/`. Static styling lives in `styles.css`.

Use synthetic presentations and a dedicated vault for testing. Format tests do not replace checks of cursor movement, selection, native undo, file reloads and editing the same presentation in MarkdownPoint.

See [LICENSE](../LICENSE), [third-party notices](../THIRD_PARTY_NOTICES.md) and the [contribution policy](../CONTRIBUTING.md) for their respective terms.
