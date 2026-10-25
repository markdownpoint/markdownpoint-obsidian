# Releasing

Releases are published from a bare version tag, such as `1.0.1`. Pushing the tag starts `.github/workflows/release.yml`, which runs the quality gate, checks that the tag matches `manifest.json`, attests the files and creates the GitHub release with `main.js`, `manifest.json` and `styles.css` as individual assets.

Run the release script from a clean `main` that matches `origin/main`:

```sh
node scripts/release
```

Choose a patch, minor or major release. The script runs `npm run check`, uses `npm version` to update `package.json`, `package-lock.json`, `manifest.json` and `versions.json` in one commit with an annotated bare tag, then pushes `main` and the tag together. `node scripts/release minor --dry-run` checks everything without changing anything.

While the version in the files has never been tagged, as before the first release, the script also offers to release that current version without a version commit. It tags the current `main` and pushes the tag.

`versions.json` maps each plugin version to its minimum Obsidian version, taken from `minAppVersion` in `manifest.json`. Raise `minAppVersion` before releasing when a new version needs a newer Obsidian.

For the first release, run `node scripts/release` and choose the current version. When the workflow has published the GitHub release with its three files, submit the repository through the [Obsidian Community directory](https://community.obsidian.md) and choose the publisher profile. The directory reads the default branch's manifest and installs from the matching GitHub release. See Obsidian's [submission guide](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin) and [plugin submission requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins). A submission does not itself grant an Official badge.
