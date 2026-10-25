# Preparing a release

1. Set the same `x.y.z` version in `manifest.json` and `package.json`, update the lockfile, and map that version to the minimum Obsidian version in `versions.json`.
2. Run `npm ci`, `npm run check` and `npm run package`. Review the CI results on the supported build platforms and verify the editor in a dedicated test vault.
3. The installation files are `main.js`, `manifest.json` and `styles.css` in `dist/markdownpoint-<version>/`. Keep the license notices embedded in `main.js`.
4. Create a GitHub release whose tag exactly matches the manifest version, without a `v` prefix. Attach the three installation files individually.
5. Submit the repository through the [Obsidian Community directory](https://community.obsidian.md). Connect the owning GitHub account and choose the appropriate publisher profile. The directory reads the default branch's manifest; installation requires the matching GitHub release and attachments.

`npm run package` only prepares local files. It does not create a Git tag, publish a release, or submit the plugin.

The user manual and screenshots live in `README.md` and `images/`. Check their relative links before publishing. Keep licensing and build instructions in their dedicated files.

See Obsidian's [submission guide](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin) and [plugin submission requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins) for the current directory process. A submission does not itself grant an Official badge.
